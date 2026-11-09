import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_NAME, openStore } from './db.mjs'
import {
  SESSION_COOKIE,
  SESSION_POLICY,
  PASSWORD_MIN_LENGTH,
  clearSessionCookie,
  createRateLimiter,
  generateRecoveryCode,
  generateSessionToken,
  hashPassword,
  hashRecoveryCode,
  isLoopbackOrigin,
  normalizeRecoveryCode,
  parseCookies,
  sessionCookie,
  sessionExpiry,
  sessionTokenHash,
  validateDisplayName,
  validateExpertise,
  validatePassword,
  validateRegistration,
  validateUsername,
  verifyPassword,
  verifyRecoveryCode,
} from './auth.mjs'
import {
  CONTENT_RULES,
  TRACK_RULES,
  effectiveExpertise,
  progressHasEvidence,
  validateProgressAccess,
} from '../shared/progression.mjs'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = join(ROOT_DIR, 'dist')
const MAX_BODY_BYTES = 2_000_000
const LOOPBACK_HOST = '127.0.0.1'
const RENDER_HOSTNAME = String(process.env.RENDER_EXTERNAL_HOSTNAME ?? '').trim().toLowerCase()
const BIND_HOST = process.env.HOST || (process.env.RENDER === 'true' ? '0.0.0.0' : LOOPBACK_HOST)

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.map', 'application/json; charset=utf-8'],
])

function parsePort(raw, fallback) {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 65535) return fallback
  return value
}

const serveStatic = process.argv.includes('--serve')
const portArg = process.argv.find((argument) => argument.startsWith('--port='))
const port = parsePort(portArg?.split('=')[1] ?? process.env.PORT, serveStatic ? 4173 : 4317)

const store = openStore()
const startedAt = new Date().toISOString()
const loginLimiter = createRateLimiter({ limit: 8, windowMs: 5 * 60_000 })
const recoveryLimiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
}

function sendJson(response, status, data, extraHeaders = {}) {
  if (response.headersSent) return
  const payload = JSON.stringify(data)
  securityHeaders(response)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8'),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end(payload)
}

function hostAllowed(hostHeader) {
  if (!hostHeader) return false
  const host = String(hostHeader).trim().toLowerCase()
  if (/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) return true
  return Boolean(RENDER_HOSTNAME && host === RENDER_HOSTNAME)
}

function originAllowed(origin, hostHeader) {
  if (!origin || isLoopbackOrigin(origin)) return true
  try {
    const parsed = new URL(origin)
    return Boolean(
      process.env.RENDER === 'true' &&
        RENDER_HOSTNAME &&
        parsed.protocol === 'https:' &&
        parsed.hostname.toLowerCase() === RENDER_HOSTNAME &&
        parsed.host.toLowerCase() === String(hostHeader ?? '').trim().toLowerCase(),
    )
  } catch {
    return false
  }
}

function applyCors(request, response) {
  const origin = request.headers.origin
  if (origin && originAllowed(origin, request.headers.host)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
    response.setHeader('Access-Control-Max-Age', '600')
  }
}

async function readJsonBody(request, response) {
  const contentType = String(request.headers['content-type'] ?? '').toLowerCase()
  if (!contentType.startsWith('application/json')) {
    sendJson(response, 415, { error: 'envie o corpo como application/json' })
    return null
  }
  let total = 0
  const chunks = []
  try {
    for await (const chunk of request) {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        sendJson(response, 413, { error: 'corpo da requisição excede 2 MB' })
        request.destroy()
        return null
      }
      chunks.push(chunk)
    }
  } catch {
    sendJson(response, 400, { error: 'falha ao ler o corpo da requisição' })
    return null
  }
  if (total === 0) {
    sendJson(response, 400, { error: 'corpo da requisição vazio' })
    return null
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    sendJson(response, 400, { error: 'JSON inválido' })
    return null
  }
}

function errorStatus(error) {
  switch (error?.code) {
    case 'INVALID_PROGRESS':
    case 'INVALID_ONBOARDING':
    case 'INVALID_EXPERTISE':
    case 'INVALID_ACCOUNT':
    case 'INVALID_ROLE':
      return 400
    case 'USERNAME_TAKEN':
    case 'ANONYMOUS_ALREADY_MIGRATED':
    case 'ANONYMOUS_PROGRESS_UNAVAILABLE':
    case 'ACCOUNT_PROGRESS_EXISTS':
    case 'EMPTY_PROGRESS':
    case 'BACKUP_HASH_MISMATCH':
    case 'BACKUP_INVALID':
    case 'BACKUP_FILE_MISSING':
    case 'CONTENT_LOCKED':
    case 'ACCOUNT_MISMATCH':
      return 409
    case 'BACKUP_NOT_FOUND':
    case 'ACCOUNT_NOT_FOUND':
      return 404
    case 'LAST_ADMIN':
      return 409
    default:
      return 500
  }
}

function errorMessage(error) {
  if (error?.code === 'BACKUP_HASH_MISMATCH') {
    return 'O hash do arquivo não confere com o registro. A restauração foi recusada para não importar dados alterados.'
  }
  if (error?.code === 'BACKUP_FILE_MISSING') {
    return 'O arquivo de backup não existe mais no diretório de dados.'
  }
  if (error?.code === 'EMPTY_PROGRESS') {
    return 'Ainda não há progresso registrado para copiar.'
  }
  if (error?.code === 'INVALID_PROGRESS') {
    return `Progresso recusado: ${error.message}.`
  }
  if (error?.code === 'USERNAME_TAKEN') {
    return 'Este nome de usuário já está em uso nesta instalação.'
  }
  if (error?.code === 'ANONYMOUS_ALREADY_MIGRATED') {
    return 'O progresso anterior já foi associado a uma conta.'
  }
  if (error?.code === 'ANONYMOUS_PROGRESS_UNAVAILABLE') {
    return 'Não há progresso anterior disponível para importar nesta instalação.'
  }
  if (error?.code === 'ACCOUNT_PROGRESS_EXISTS') {
    return 'Esta conta já possui progresso próprio; a importação não sobrescreve dados.'
  }
  if (error?.code === 'CONTENT_LOCKED') {
    return error.message
  }
  if (error?.code === 'ACCOUNT_MISMATCH') {
    return 'A sessão ativa não corresponde à conta que originou esta gravação. A alteração foi recusada.'
  }
  if (error?.code === 'LAST_ADMIN') {
    return 'A instalação precisa de pelo menos uma conta administradora. Promova outra conta antes de rebaixar esta.'
  }
  if (error?.code === 'INVALID_ROLE') {
    return 'Papel de conta inválido.'
  }
  return error?.message || 'Erro interno no servidor local.'
}

function clientKey(request, suffix) {
  const address = request.socket?.remoteAddress ?? 'local'
  return `${address}:${suffix}`
}

function publicAccount(account, progress) {
  if (!account) return null
  const progressValue = progress?.progress ?? {}
  return {
    ...account,
    isAdmin: account.role === 'admin',
    effectiveExpertise: effectiveExpertise(account.expertise, progressValue),
    hasProgress: progressHasEvidence(progressValue),
  }
}

function sessionPayload(session, account, progress) {
  return {
    account: publicAccount(account, progress),
    session: {
      expiresAt: session.expiresAt,
      policy: SESSION_POLICY,
    },
  }
}

function createSessionFor(accountId) {
  const token = generateSessionToken()
  const tokenHash = sessionTokenHash(token)
  const expiresAt = sessionExpiry()
  store.deleteExpiredSessions()
  store.createSession(accountId, tokenHash, expiresAt)
  return { token, expiresAt }
}

function getAuthenticated(request) {
  const cookies = parseCookies(request.headers.cookie)
  const token = cookies[SESSION_COOKIE]
  if (!token) return null
  const tokenHash = sessionTokenHash(token)
  const session = store.findSession(tokenHash)
  if (!session) return null
  store.touchSession(tokenHash)
  let account = session.account
  const progress = store.readAccountProgress(account.id)
  if (
    progress &&
    progressHasEvidence(progress.progress) &&
    account.onboardingStatus !== 'completed'
  ) {
    account = store.setOnboardingStatus(account.id, 'completed')
  }
  return { token, tokenHash, session, account, progress }
}

function requireAuth(request, response) {
  const auth = getAuthenticated(request)
  if (!auth) {
    sendJson(response, 401, {
      error: 'Sessão expirada ou inválida. Entre novamente.',
      code: 'UNAUTHORIZED',
    })
    return null
  }
  return auth
}

/**
 * Autorização administrativa verificada no servidor. Esconder o link no
 * frontend não substitui esta checagem.
 */
function requireAdmin(request, response) {
  const auth = requireAuth(request, response)
  if (!auth) return null
  if (auth.account.role !== 'admin') {
    sendJson(response, 403, {
      error: 'Esta área é restrita à conta administradora desta instalação.',
      code: 'FORBIDDEN',
    })
    return null
  }
  return auth
}

function suitabilityMessage(violations) {
  const first = violations[0]
  const rule = CONTENT_RULES[first.contentId]
  const title = rule?.title ?? first.contentId
  if (first.reason === 'nivel') {
    return `O conteúdo “${title}” ainda não está disponível para o seu nível efetivo.`
  }
  return `O conteúdo “${title}” exige pré-requisitos que ainda não foram demonstrados neste progresso.`
}

async function handleApi(request, response, url) {
  const { pathname } = url
  const method = request.method ?? 'GET'

  if (pathname === '/api/health' && method === 'GET') {
    sendJson(response, 200, {
      ok: true,
      app: APP_NAME,
      storage: 'sqlite',
      schemaVersion: store.schemaVersion,
      dataDir: store.dataDir,
      dbPath: store.dbPath,
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
    })
    return true
  }

  if (pathname === '/api/setup' && method === 'GET') {
    const anonymous = store.getAnonymousProgressStatus()
    sendJson(response, 200, {
      app: APP_NAME,
      hasAccounts: store.hasAccounts(),
      hasAnonymousProgress: anonymous.hasAnonymousProgress,
      anonymousProgressMigrated: anonymous.migrated,
      sessionPolicy: SESSION_POLICY,
      passwordPolicy: { minLength: PASSWORD_MIN_LENGTH, hashing: 'scrypt' },
      localOnly: process.env.RENDER !== 'true',
    })
    return true
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readJsonBody(request, response)
    if (!body) return true
    const validation = validateRegistration(body)
    if (!validation.ok) {
      sendJson(response, 400, { error: validation.error, field: validation.field })
      return true
    }
    try {
      const recoveryCode = generateRecoveryCode()
      const account = store.registerAccount({
        displayName: validation.displayName,
        username: validation.username,
        passwordHash: hashPassword(validation.password),
        recoveryHash: hashRecoveryCode(recoveryCode),
        expertise: validation.expertise,
        initialExpertise: validation.expertise,
        onboardingStatus: 'pending',
        migrateAnonymous: Boolean(body.migrateAnonymousProgress),
      })
      const progress = store.readAccountProgress(account.id)
      const session = createSessionFor(account.id)
      const updatedAccount = store.getAccount(account.id)
      sendJson(
        response,
        201,
        {
          ...sessionPayload(session, updatedAccount, progress),
          recoveryCode,
          recoveryNotice:
            'Guarde este código. Ele é exibido uma única vez e permite redefinir a senha sem e-mail.',
        },
        { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) },
      )
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJsonBody(request, response)
    if (!body) return true
    const username = validateUsername(body.username)
    if (!username.ok || typeof body.password !== 'string') {
      sendJson(response, 401, { error: 'Usuário ou senha inválidos.' })
      return true
    }
    const key = clientKey(request, `login:${username.username}`)
    const gate = loginLimiter.check(key)
    if (!gate.allowed) {
      sendJson(
        response,
        429,
        { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
        { 'Retry-After': String(gate.retryAfterSeconds ?? 60) },
      )
      return true
    }
    const accountWithSecrets = store.getAccountAuthByUsername(username.username)
    if (!accountWithSecrets || !verifyPassword(body.password, accountWithSecrets.passwordHash)) {
      loginLimiter.fail(key)
      sendJson(response, 401, { error: 'Usuário ou senha inválidos.' })
      return true
    }
    loginLimiter.reset(key)
    store.deleteExpiredSessions()
    const session = createSessionFor(accountWithSecrets.id)
    const account = store.getAccount(accountWithSecrets.id)
    const progress = store.readAccountProgress(account.id)
    sendJson(
      response,
      200,
      sessionPayload(session, account, progress),
      { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) },
    )
    return true
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const cookies = parseCookies(request.headers.cookie)
    const token = cookies[SESSION_COOKIE]
    if (token) store.deleteSession(sessionTokenHash(token))
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
    return true
  }

  if (pathname === '/api/auth/session' && method === 'GET') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const anonymous = store.getAnonymousProgressStatus()
    const progress = store.readAccountProgress(auth.account.id)
    sendJson(response, 200, {
      ...sessionPayload(auth.session, auth.account, progress),
      anonymousProgressAvailable: anonymous.hasAnonymousProgress,
      dataDir: store.dataDir,
    })
    return true
  }

  if (pathname === '/api/auth/recover' && method === 'POST') {
    const body = await readJsonBody(request, response)
    if (!body) return true
    const username = validateUsername(body.username)
    const password = validatePassword(body.newPassword)
    if (!username.ok || !password.ok) {
      sendJson(response, 400, {
        error: !username.ok ? username.error : password.error,
        field: !username.ok ? 'username' : 'newPassword',
      })
      return true
    }
    if (String(body.confirmPassword ?? '') !== password.password) {
      sendJson(response, 400, { error: 'As senhas não coincidem.', field: 'confirmPassword' })
      return true
    }
    const code = normalizeRecoveryCode(body.recoveryCode)
    if (!code) {
      sendJson(response, 400, { error: 'Informe o código de recuperação.', field: 'recoveryCode' })
      return true
    }
    const key = clientKey(request, 'recover')
    const gate = recoveryLimiter.check(key)
    if (!gate.allowed) {
      sendJson(
        response,
        429,
        { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
        { 'Retry-After': String(gate.retryAfterSeconds ?? 60) },
      )
      return true
    }
    const accountWithSecrets = store.getAccountAuthByUsername(username.username)
    if (!accountWithSecrets || !verifyRecoveryCode(code, accountWithSecrets.recoveryHash)) {
      recoveryLimiter.fail(key)
      sendJson(response, 401, { error: 'Usuário ou código de recuperação inválidos.' })
      return true
    }
    recoveryLimiter.reset(key)
    const newRecoveryCode = generateRecoveryCode()
    store.updateAccountSecrets(accountWithSecrets.id, {
      passwordHash: hashPassword(password.password),
      recoveryHash: hashRecoveryCode(newRecoveryCode),
    })
    store.deleteAccountSessions(accountWithSecrets.id)
    sendJson(response, 200, {
      ok: true,
      recoveryCode: newRecoveryCode,
      notice: 'Senha redefinida. Guarde o novo código de recuperação; o anterior não é mais válido.',
    })
    return true
  }

  if (pathname === '/api/account' && method === 'PATCH') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const body = await readJsonBody(request, response)
    if (!body) return true
    const displayName =
      body.displayName === undefined
        ? { ok: true, displayName: auth.account.displayName }
        : validateDisplayName(body.displayName)
    if (!displayName.ok) {
      sendJson(response, 400, { error: displayName.error, field: 'displayName' })
      return true
    }
    const expertise =
      body.expertise === undefined
        ? { ok: true, expertise: auth.account.expertise }
        : validateExpertise(body.expertise)
    if (!expertise.ok) {
      sendJson(response, 400, { error: expertise.error, field: 'expertise' })
      return true
    }
    try {
      const account = store.updateAccount(auth.account.id, {
        displayName: displayName.displayName,
        expertise: expertise.expertise,
      })
      const progress = store.readAccountProgress(auth.account.id)
      sendJson(response, 200, sessionPayload(auth.session, account, progress))
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname === '/api/account/recovery-code' && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const recoveryCode = generateRecoveryCode()
    store.setRecoveryHash(auth.account.id, hashRecoveryCode(recoveryCode))
    sendJson(response, 200, {
      ok: true,
      recoveryCode,
      notice:
        'Novo código gerado. O código anterior deixou de funcionar. Guarde este código fora do aplicativo.',
    })
    return true
  }

  if (pathname === '/api/onboarding' && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const body = await readJsonBody(request, response)
    if (!body) return true
    const status = body.status
    if (status !== 'started' && status !== 'completed') {
      sendJson(response, 400, { error: 'Estado de onboarding inválido.' })
      return true
    }
    if (auth.account.onboardingStatus === 'completed') {
      sendJson(response, 200, sessionPayload(auth.session, auth.account, auth.progress))
      return true
    }
    const account = store.setOnboardingStatus(auth.account.id, status)
    sendJson(response, 200, sessionPayload(auth.session, account, auth.progress))
    return true
  }

  if (pathname === '/api/account/import-anonymous' && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    try {
      const imported = store.claimAnonymousProgress(auth.account.id)
      const account = store.getAccount(auth.account.id)
      sendJson(response, 200, {
        ok: true,
        progress: imported.progress,
        updatedAt: imported.updatedAt,
        account: publicAccount(account, imported),
        dataDir: store.dataDir,
      })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname === '/api/progress' && method === 'GET') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const current = auth.progress
    if (!current) {
      sendJson(response, 404, { error: 'sem-progresso', dataDir: store.dataDir })
      return true
    }
    sendJson(response, 200, {
      progress: current.progress,
      updatedAt: current.updatedAt,
      dataDir: store.dataDir,
    })
    return true
  }

  if (pathname === '/api/progress' && method === 'PUT') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    const body = await readJsonBody(request, response)
    if (!body) return true
    if (typeof body.accountId === 'string' && body.accountId !== auth.account.id) {
      sendJson(response, 409, {
        error: errorMessage({ code: 'ACCOUNT_MISMATCH' }),
        code: 'ACCOUNT_MISMATCH',
      })
      return true
    }
    const previous = auth.progress?.progress ?? null
    const violations = validateProgressAccess(previous, body.progress, auth.account.expertise, {
      admin: auth.account.role === 'admin',
    })
    if (violations.length > 0) {
      sendJson(response, 403, {
        error: suitabilityMessage(violations),
        code: 'CONTENT_LOCKED',
        violations: violations.map((violation) => ({
          contentId: violation.contentId,
          reason: violation.reason,
          missingContent: violation.missingContent,
          missingSkills: violation.missingSkills,
        })),
      })
      return true
    }
    try {
      const { updatedAt } = store.writeAccountProgress(auth.account.id, body.progress)
      if (
        auth.account.onboardingStatus !== 'completed' &&
        progressHasEvidence(body.progress)
      ) {
        store.setOnboardingStatus(auth.account.id, 'completed')
      }
      sendJson(response, 200, { ok: true, updatedAt, dataDir: store.dataDir })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname === '/api/admin/overview' && method === 'GET') {
    const auth = requireAdmin(request, response)
    if (!auth) return true
    const accounts = store.listAccountOverviews()
    const content = Object.values(CONTENT_RULES)
    sendJson(response, 200, {
      ok: true,
      app: APP_NAME,
      schemaVersion: store.schemaVersion,
      dataDir: store.dataDir,
      viewer: { id: auth.account.id, username: auth.account.username, role: auth.account.role },
      accountCount: accounts.length,
      adminCount: accounts.filter((account) => account.role === 'admin').length,
      accounts,
      content: {
        total: content.length,
        lessons: content.filter((item) => item.type === 'lesson').length,
        labs: content.filter((item) => item.type === 'lab').length,
        cases: content.filter((item) => item.type === 'case').length,
        tracks: Object.keys(TRACK_RULES).length,
      },
      generatedAt: new Date().toISOString(),
    })
    return true
  }

  if (pathname === '/api/admin/elevate' && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    try {
      const alreadyAdmin = auth.account.role === 'admin'
      const updated = store.setAccountRole(auth.account.id, 'admin')
      sendJson(response, 200, {
        ok: true,
        alreadyAdmin,
        account: publicAccount(updated, store.readAccountProgress(auth.account.id)),
      })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  const adminRoleMatch = pathname.match(/^\/api\/admin\/accounts\/([^/]+)\/role$/)
  if (adminRoleMatch && method === 'PATCH') {
    const auth = requireAdmin(request, response)
    if (!auth) return true
    const body = await readJsonBody(request, response)
    if (!body) return true
    if (body.role !== 'admin' && body.role !== 'member') {
      sendJson(response, 400, { error: 'Papel de conta inválido.', code: 'INVALID_ROLE' })
      return true
    }
    try {
      const updated = store.setAccountRole(decodeURIComponent(adminRoleMatch[1]), body.role)
      const overview = store.listAccountOverviews().find((account) => account.id === updated.id)
      sendJson(response, 200, { ok: true, account: overview })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname === '/api/backups' && method === 'GET') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    sendJson(response, 200, { backups: store.listAccountBackups(auth.account.id) })
    return true
  }

  if (pathname === '/api/backups' && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    try {
      const backup = store.createAccountBackup(auth.account.id, 'manual')
      sendJson(response, 201, { ok: true, backup })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  const restoreMatch = pathname.match(/^\/api\/backups\/(\d+)\/restore$/)
  if (restoreMatch && method === 'POST') {
    const auth = requireAuth(request, response)
    if (!auth) return true
    try {
      const restored = store.restoreAccountBackup(auth.account.id, Number(restoreMatch[1]))
      sendJson(response, 200, {
        ok: true,
        progress: restored.progress,
        updatedAt: restored.updatedAt,
        restoredFrom: restored.restoredFrom,
        safetyBackup: restored.safetyBackup,
      })
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error), code: error?.code })
    }
    return true
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'rota de API não encontrada' })
    return true
  }

  return false
}

function staticCsp() {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ')
}

function sendFile(response, filePath, { immutable = false } = {}) {
  const extension = extname(filePath).toLowerCase()
  const headers = {
    'Content-Type': MIME_TYPES.get(extension) ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  }
  securityHeaders(response)
  if (extension === '.html') headers['Content-Security-Policy'] = staticCsp()
  response.writeHead(200, headers)
  const stream = createReadStream(filePath)
  stream.on('error', () => {
    if (!response.headersSent) sendJson(response, 500, { error: 'falha ao ler arquivo estático' })
    else response.destroy()
  })
  stream.pipe(response)
}

function handleStatic(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'método não permitido' }, { Allow: 'GET, HEAD' })
    return
  }
  if (!serveStatic) {
    sendJson(response, 200, {
      app: APP_NAME,
      message:
        'API local do PeritSec em execução. Use a interface em http://127.0.0.1:5173 durante o desenvolvimento ou inicie com --serve para servir a versão compilada.',
      health: '/api/health',
    })
    return
  }
  if (!existsSync(DIST_DIR)) {
    sendJson(response, 503, {
      error: 'A pasta dist/ não existe. Execute "npm run build" antes de iniciar com --serve.',
    })
    return
  }

  let decoded
  try {
    decoded = decodeURIComponent(url.pathname)
  } catch {
    sendJson(response, 400, { error: 'caminho inválido' })
    return
  }
  if (decoded.includes('\0')) {
    sendJson(response, 400, { error: 'caminho inválido' })
    return
  }

  const relative = decoded === '/' ? '/index.html' : decoded
  const candidate = resolve(DIST_DIR, `.${relative}`)
  if (candidate !== DIST_DIR && !candidate.startsWith(DIST_DIR + sep)) {
    sendJson(response, 403, { error: 'acesso fora do diretório publicado' })
    return
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    sendFile(response, candidate, { immutable: relative.startsWith('/assets/') })
    return
  }

  if (!extname(relative)) {
    sendFile(response, join(DIST_DIR, 'index.html'))
    return
  }

  sendJson(response, 404, { error: 'arquivo não encontrado' })
}

const server = createServer(async (request, response) => {
  try {
    if (!hostAllowed(request.headers.host)) {
      sendJson(response, 421, { error: 'host não permitido; acesse pelo loopback local' })
      return
    }

    const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
    const origin = request.headers.origin

    if (url.pathname.startsWith('/api/') && origin && !originAllowed(origin, request.headers.host)) {
      sendJson(response, 403, { error: 'origem não autorizada' })
      return
    }

    applyCors(request, response)

    if (request.method === 'OPTIONS') {
      if (!origin || originAllowed(origin, request.headers.host)) {
        response.writeHead(204)
        response.end()
      } else {
        sendJson(response, 403, { error: 'origem não autorizada' })
      }
      return
    }

    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(request, response, url)
      if (!handled) sendJson(response, 404, { error: 'rota não encontrada' })
      return
    }

    handleStatic(request, response, url)
  } catch (error) {
    console.error('[peritsec] erro não tratado:', error?.message ?? error)
    sendJson(response, 500, { error: 'erro interno no servidor local' })
  }
})

server.listen(port, BIND_HOST, () => {
  const actualPort = server.address()?.port ?? port
  console.log(`[peritsec] API ${process.env.RENDER === 'true' ? 'publicada' : 'local'} em http://${BIND_HOST}:${actualPort}`)
  console.log(`[peritsec] dados em ${store.dataDir}`)
  console.log(`[peritsec] SQLite schema v${store.schemaVersion}`)
  if (serveStatic) console.log('[peritsec] servindo dist/ para uso offline')
})

function shutdown(signal) {
  console.log(`[peritsec] encerrando (${signal})`)
  server.close(() => {
    store.close()
    process.exit(0)
  })
  setTimeout(() => {
    store.close()
    process.exit(1)
  }, 4000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `[peritsec] a porta ${port} já está em uso. Encerre o outro processo ou use --port= outra porta.`,
    )
  } else {
    console.error('[peritsec] falha ao iniciar:', error)
  }
  store.close()
  process.exit(1)
})
