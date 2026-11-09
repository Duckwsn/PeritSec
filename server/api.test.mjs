import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { openStore } from './db.mjs'

const PROJECT_DIR = resolve(import.meta.dirname, '..')
const DATA_DIR = mkdtempSync(join(tmpdir(), 'peritsec-api-'))
const PASSWORD = 'SenhaLocal#2026'
const NEW_PASSWORD = 'OutraSenhaLocal#2026'
const LEGACY_LABEL = 'progresso anônimo anterior'

let child
let baseUrl
let anaClient
let brunoClient
let anaAccountId
let anaProgress
let anaBackup
let brunoProgress
let membroClient
let membroAccountId

function fixture(label = 'estado inicial') {
  return {
    version: 1,
    exercises: {},
    lessons: {},
    labs: {},
    cases: {},
    activity: [
      {
        id: `evt-${label.replace(/\s+/g, '-')}`,
        at: '2026-10-20T10:00:00.000Z',
        type: 'sistema',
        label,
      },
    ],
  }
}

function lessonRecord(label) {
  return {
    completedAt: '2026-10-20T10:00:00.000Z',
    competency: 'redes',
    score: 100,
    label,
  }
}

function addLesson(state, contentId, label) {
  return {
    ...state,
    lessons: {
      ...state.lessons,
      [contentId]: lessonRecord(label),
    },
    activity: [
      ...state.activity,
      {
        id: `evt-${contentId}-${label.replace(/\s+/g, '-')}`,
        at: '2026-10-20T10:05:00.000Z',
        type: 'licao',
        label,
      },
    ],
  }
}

function addCase(state, caseId) {
  return {
    ...state,
    cases: {
      ...state.cases,
      [caseId]: {
        evidenceOpened: ['ev-01'],
        actions: [],
        submitted: null,
      },
    },
  }
}

function legacyFixture() {
  return addLesson(fixture(LEGACY_LABEL), 'caminho-do-pacote', 'lição anterior')
}

class ApiClient {
  constructor(label = 'cliente') {
    this.label = label
    this.cookie = null
  }

  async request(path, { method = 'GET', body, headers = {} } = {}) {
    const requestHeaders = {
      Accept: 'application/json',
      ...headers,
    }
    let payload
    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    if (this.cookie) requestHeaders.Cookie = this.cookie

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: payload,
    })

    let setCookie = null
    const singleCookie = response.headers.get('set-cookie')
    const cookies =
      response.headers.getSetCookie?.() ?? (singleCookie ? [singleCookie] : [])
    for (const raw of cookies) {
      if (raw.startsWith('peritsec_session=')) {
        setCookie = raw
        const pair = raw.split(';')[0]
        const value = pair.slice(pair.indexOf('=') + 1)
        this.cookie = value ? pair : null
      }
    }

    const text = await response.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    return {
      status: response.status,
      headers: response.headers,
      data,
      setCookie,
    }
  }

  register(body) {
    return this.request('/api/auth/register', { method: 'POST', body })
  }

  login(body) {
    return this.request('/api/auth/login', { method: 'POST', body })
  }

  get(path) {
    return this.request(path)
  }

  post(path, body = {}) {
    return this.request(path, { method: 'POST', body })
  }

  put(path, body) {
    return this.request(path, { method: 'PUT', body })
  }

  patch(path, body) {
    return this.request(path, { method: 'PATCH', body })
  }
}

function registration(username, overrides = {}) {
  return {
    displayName:
      overrides.displayName ?? `Pessoa ${username.charAt(0).toUpperCase()}${username.slice(1)}`,
    username,
    password: overrides.password ?? PASSWORD,
    confirmPassword: overrides.confirmPassword ?? overrides.password ?? PASSWORD,
    expertise: overrides.expertise ?? 'iniciante',
    ...(overrides.migrateAnonymousProgress === undefined
      ? {}
      : { migrateAnonymousProgress: overrides.migrateAnonymousProgress }),
  }
}

function startServer() {
  return new Promise((resolvePromise, reject) => {
    const processChild = spawn(process.execPath, ['server/index.mjs', '--port=0'], {
      cwd: PROJECT_DIR,
      env: {
        ...process.env,
        PERITSEC_DATA_DIR: DATA_DIR,
        PERITSEC_SECURE_COOKIE: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let errors = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      processChild.kill()
      reject(new Error(`servidor não iniciou em 8s. stdout: ${output} stderr: ${errors}`))
    }, 8000)

    processChild.stdout.on('data', (chunk) => {
      output += chunk.toString()
      const match = output.match(/API local em http:\/\/127\.0\.0\.1:(\d+)/)
      if (match && !settled) {
        settled = true
        clearTimeout(timer)
        resolvePromise({ processChild, port: Number(match[1]) })
      }
    })
    processChild.stderr.on('data', (chunk) => {
      errors += chunk.toString()
    })
    processChild.on('exit', (code) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      reject(new Error(`servidor encerrou com código ${code}. stderr: ${errors}`))
    })
  })
}

before(async () => {
  const seed = openStore({ dataDir: DATA_DIR })
  seed.writeProgress(legacyFixture())
  seed.close()

  const started = await startServer()
  child = started.processChild
  baseUrl = `http://127.0.0.1:${started.port}`
})

after(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
    await new Promise((resolvePromise) => {
      child.once('exit', resolvePromise)
      setTimeout(resolvePromise, 3000)
    })
  }
  rmSync(DATA_DIR, { recursive: true, force: true })
})

test('health, setup e barreiras iniciais refletem SQLite v3 e progresso legado', async () => {
  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  const healthBody = await health.json()
  assert.equal(healthBody.ok, true)
  assert.equal(healthBody.storage, 'sqlite')
  assert.equal(healthBody.schemaVersion, 3)
  assert.equal(healthBody.dataDir, DATA_DIR)

  const setup = await fetch(`${baseUrl}/api/setup`)
  assert.equal(setup.status, 200)
  const setupBody = await setup.json()
  assert.equal(setupBody.hasAccounts, false)
  assert.equal(setupBody.hasAnonymousProgress, true)
  assert.equal(setupBody.anonymousProgressMigrated, false)
  assert.equal(setupBody.localOnly, true)
  assert.equal(setupBody.passwordPolicy.hashing, 'scrypt')

  const unauthenticated = await fetch(`${baseUrl}/api/progress`)
  assert.equal(unauthenticated.status, 401)
  assert.equal((await unauthenticated.json()).code, 'UNAUTHORIZED')

  const options = await fetch(`${baseUrl}/api/progress`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173' },
  })
  assert.equal(options.status, 204)
  assert.equal(options.headers.get('access-control-allow-credentials'), 'true')

  const blockedOrigin = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { Origin: 'https://exemplo-malicioso.test' },
    body: '{}',
  })
  assert.equal(blockedOrigin.status, 403)
})

test('cadastro, onboarding, progresso e bloqueios reais funcionam por conta', async () => {
  anaClient = new ApiClient('ana')
  const registered = await anaClient.register(
    registration('ana.local', { displayName: 'Ana Perita' }),
  )
  assert.equal(registered.status, 201)
  assert.match(registered.data.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  assert.equal(typeof registered.data.recoveryNotice, 'string')
  assert.ok(registered.setCookie)
  assert.match(registered.setCookie, /HttpOnly/)
  assert.match(registered.setCookie, /SameSite=Strict/)
  assert.match(registered.setCookie, /Max-Age=\d+/)
  assert.equal(registered.data.account.username, 'ana.local')
  assert.equal(registered.data.account.onboardingStatus, 'pending')
  assert.equal(registered.data.account.effectiveExpertise.id, 'iniciante')
  assert.equal(registered.data.account.hasProgress, false)
  assert.equal(typeof registered.data.session.expiresAt, 'string')
  assert.equal(JSON.stringify(registered.data).includes(PASSWORD), false)
  assert.equal(JSON.stringify(registered.data).includes('scrypt$'), false)
  assert.equal(registered.data.account.role, 'admin')
  assert.equal(registered.data.account.isAdmin, true)

  membroClient = new ApiClient('membro')
  const membroRegistered = await membroClient.register(
    registration('membro', { displayName: 'Membro Teste' }),
  )
  assert.equal(membroRegistered.status, 201)
  assert.equal(membroRegistered.data.account.role, 'member')
  assert.equal(membroRegistered.data.account.isAdmin, false)
  membroAccountId = membroRegistered.data.account.id

  anaAccountId = registered.data.account.id

  const duplicate = await new ApiClient('duplicada').register(
    registration('ANA.LOCAL', { displayName: 'Outra Ana' }),
  )
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.data.code, 'USERNAME_TAKEN')

  const noExpertise = await new ApiClient('sem-nivel').register(
    registration('sem-nivel', { expertise: '' }),
  )
  assert.equal(noExpertise.status, 400)
  assert.equal(noExpertise.data.field, 'expertise')

  const mismatchPassword = await new ApiClient('senha-divergente').register({
    ...registration('senha-divergente'),
    confirmPassword: 'outra-senha-qualquer',
  })
  assert.equal(mismatchPassword.status, 400)
  assert.equal(mismatchPassword.data.field, 'confirmPassword')

  const weakPassword = await new ApiClient('senha-curta').register(
    registration('senha-curta', { password: 'curta' }),
  )
  assert.equal(weakPassword.status, 400)
  assert.equal(weakPassword.data.field, 'password')

  let session = await anaClient.get('/api/auth/session')
  assert.equal(session.status, 200)
  assert.equal(session.data.account.onboardingStatus, 'pending')
  assert.equal(session.data.anonymousProgressAvailable, true)
  assert.equal(session.data.dataDir, DATA_DIR)

  const started = await anaClient.post('/api/onboarding', { status: 'started' })
  assert.equal(started.status, 200)
  assert.equal(started.data.account.onboardingStatus, 'started')
  assert.ok(started.data.account.onboardingStartedAt)
  assert.equal(started.data.account.onboardingCompletedAt, null)

  session = await anaClient.get('/api/auth/session')
  assert.equal(session.data.account.onboardingStatus, 'started')

  const emptyProgress = await anaClient.get('/api/progress')
  assert.equal(emptyProgress.status, 404)
  assert.equal(emptyProgress.data.error, 'sem-progresso')

  const invalid = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: { version: 2 },
  })
  assert.equal(invalid.status, 400)
  assert.equal(invalid.data.code, 'INVALID_PROGRESS')

  const wrongAccount = await anaClient.put('/api/progress', {
    accountId: 'outra-conta',
    progress: fixture('tentativa alheia'),
  })
  assert.equal(wrongAccount.status, 409)
  assert.equal(wrongAccount.data.code, 'ACCOUNT_MISMATCH')

  const noContentType = await fetch(`${baseUrl}/api/progress`, {
    method: 'PUT',
    headers: { Cookie: anaClient.cookie },
    body: JSON.stringify({ accountId: anaAccountId, progress: fixture('sem tipo') }),
  })
  assert.equal(noContentType.status, 415)

  const base = fixture('progresso da Ana')
  const withFirstLesson = addLesson(base, 'caminho-do-pacote', 'primeira lição')
  const saved = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: withFirstLesson,
  })
  assert.equal(saved.status, 200)
  assert.equal(typeof saved.data.updatedAt, 'string')

  session = await anaClient.get('/api/auth/session')
  assert.equal(session.data.account.onboardingStatus, 'completed')
  assert.ok(session.data.account.onboardingCompletedAt)
  assert.equal(session.data.account.hasProgress, true)

  const reopened = await anaClient.get('/api/progress')
  assert.equal(reopened.status, 200)
  assert.deepEqual(reopened.data.progress, withFirstLesson)
  assert.equal(reopened.data.dataDir, DATA_DIR)

  const completedAgain = await anaClient.post('/api/onboarding', { status: 'started' })
  assert.equal(completedAgain.status, 200)
  assert.equal(completedAgain.data.account.onboardingStatus, 'completed')

  const membroBase = addLesson(
    fixture('progresso do membro'),
    'caminho-do-pacote',
    'lição do membro',
  )
  const membroSaved = await membroClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: membroBase,
  })
  assert.equal(membroSaved.status, 200)

  const sameSaveBypass = {
    ...membroBase,
    lessons: {
      ...membroBase.lessons,
      'ipv4-cidr': lessonRecord('ipv4 no mesmo envio'),
      'arp-gateway-rota': lessonRecord('arp no mesmo envio'),
    },
  }
  const bypass = await membroClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: sameSaveBypass,
  })
  assert.equal(bypass.status, 403)
  assert.equal(bypass.data.code, 'CONTENT_LOCKED')
  assert.ok(bypass.data.violations.some((item) => item.contentId === 'arp-gateway-rota'))
  const arpViolation = bypass.data.violations.find(
    (item) => item.contentId === 'arp-gateway-rota',
  )
  assert.ok(arpViolation.missingContent.includes('ipv4-cidr'))

  const stillSaved = await membroClient.get('/api/progress')
  assert.deepEqual(stillSaved.data.progress, membroBase)

  const blockedCase = await membroClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: addCase(membroBase, 'portal-fora-do-ar'),
  })
  assert.equal(blockedCase.status, 403)
  assert.equal(blockedCase.data.code, 'CONTENT_LOCKED')

  const blockedTrafficLab = await membroClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: {
      ...membroBase,
      labs: { 'lab-trafego': { completedAt: '2026-10-20T10:00:00.000Z' } },
    },
  })
  assert.equal(blockedTrafficLab.status, 403)

  const membroLevel = await membroClient.patch('/api/account', { expertise: 'avancado' })
  assert.equal(membroLevel.status, 200)
  const stillBlockedByPrerequisite = await membroClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: addCase(membroBase, 'portal-fora-do-ar'),
  })
  assert.equal(stillBlockedByPrerequisite.status, 403)
  assert.equal(stillBlockedByPrerequisite.data.code, 'CONTENT_LOCKED')
  assert.equal(stillBlockedByPrerequisite.data.violations[0].reason, 'prerequisito')

  const withIpv4 = addLesson(withFirstLesson, 'ipv4-cidr', 'endereçamento IPv4')
  const savedIpv4 = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: withIpv4,
  })
  assert.equal(savedIpv4.status, 200)

  session = await anaClient.get('/api/auth/session')
  assert.equal(session.data.account.expertise, 'iniciante')
  assert.equal(session.data.account.effectiveExpertise.id, 'curioso')
  assert.equal(session.data.account.hasProgress, true)

  const backup = await anaClient.post('/api/backups', {})
  assert.equal(backup.status, 201)
  assert.match(backup.data.backup.fileName, /^peritsec-ana\.local-/)
  assert.equal(backup.data.backup.sha256.length, 64)
  anaBackup = backup.data.backup

  const withArp = addLesson(withIpv4, 'arp-gateway-rota', 'ARP e gateway')
  const savedArp = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: withArp,
  })
  assert.equal(savedArp.status, 200)
  const arpState = await anaClient.get('/api/progress')
  assert.deepEqual(arpState.data.progress, withArp)

  const restored = await anaClient.post(`/api/backups/${anaBackup.id}/restore`, {})
  assert.equal(restored.status, 200)
  assert.deepEqual(restored.data.progress, withIpv4)
  assert.equal(restored.data.restoredFrom.id, anaBackup.id)
  assert.match(restored.data.safetyBackup.fileName, /pre-restauracao/)
  const afterRestore = await anaClient.get('/api/progress')
  assert.deepEqual(afterRestore.data.progress, withIpv4)

  const backups = await anaClient.get('/api/backups')
  assert.equal(backups.data.backups.length, 2)
  anaProgress = withIpv4

  const patch = await anaClient.patch('/api/account', {
    displayName: 'Ana Perita Sênior',
    expertise: 'avancado',
  })
  assert.equal(patch.status, 200)
  assert.equal(patch.data.account.displayName, 'Ana Perita Sênior')
  assert.equal(patch.data.account.expertise, 'avancado')
  assert.equal(patch.data.account.initialExpertise, 'iniciante')
  assert.equal(patch.data.account.effectiveExpertise.id, 'avancado')
  assert.equal(patch.data.account.hasProgress, true)

  const backupsAfterLevel = await anaClient.get('/api/backups')
  assert.equal(backupsAfterLevel.data.backups.length, 2)
  const progressAfterLevel = await anaClient.get('/api/progress')
  assert.deepEqual(progressAfterLevel.data.progress, withIpv4)

  const invalidLevel = await anaClient.patch('/api/account', { expertise: 'especialista' })
  assert.equal(invalidLevel.status, 400)
  assert.equal(invalidLevel.data.field, 'expertise')
})

test('contas diferentes não compartilham progresso, backups nem sessão', async () => {
  brunoClient = new ApiClient('bruno')
  const registered = await brunoClient.register(
    registration('Bruno.Local', { displayName: 'Bruno Local', expertise: 'intermediario' }),
  )
  assert.equal(registered.status, 201)
  assert.equal(registered.data.account.username, 'bruno.local')
  assert.equal(registered.data.account.effectiveExpertise.id, 'intermediario')

  const empty = await brunoClient.get('/api/progress')
  assert.equal(empty.status, 404)

  const base = fixture('progresso do Bruno')
  const withMethod = addLesson(base, 'metodo-troubleshooting', 'método do Bruno')
  const saved = await brunoClient.put('/api/progress', {
    accountId: registered.data.account.id,
    progress: withMethod,
  })
  assert.equal(saved.status, 200)
  brunoProgress = withMethod

  const brunoView = await brunoClient.get('/api/progress')
  assert.deepEqual(brunoView.data.progress, withMethod)

  const anaView = await anaClient.get('/api/progress')
  assert.deepEqual(anaView.data.progress, anaProgress)
  assert.equal('metodo-troubleshooting' in anaView.data.progress.lessons, false)

  const mismatch = await brunoClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: withMethod,
  })
  assert.equal(mismatch.status, 409)
  assert.equal(mismatch.data.code, 'ACCOUNT_MISMATCH')

  const brunoBackups = await brunoClient.get('/api/backups')
  assert.deepEqual(brunoBackups.data.backups, [])

  const restoreForeign = await brunoClient.post(`/api/backups/${anaBackup.id}/restore`, {})
  assert.equal(restoreForeign.status, 404)
  assert.equal(restoreForeign.data.code, 'BACKUP_NOT_FOUND')

  const anaBackups = await anaClient.get('/api/backups')
  assert.equal(anaBackups.data.backups.length, 2)
  assert.ok(
    anaBackups.data.backups.every((item) => item.fileName.startsWith('peritsec-ana.local-')),
  )
  assert.ok(anaBackups.data.backups.some((item) => item.id === anaBackup.id))

  const brunoSession = await brunoClient.get('/api/auth/session')
  assert.equal(brunoSession.data.account.username, 'bruno.local')
  assert.equal(brunoSession.data.account.hasProgress, true)
})

test('progresso anônimo é importado uma única vez, de forma idempotente', async () => {
  const setupBefore = await fetch(`${baseUrl}/api/setup`)
  const beforeBody = await setupBefore.json()
  assert.equal(beforeBody.hasAnonymousProgress, true)
  assert.equal(beforeBody.anonymousProgressMigrated, false)

  const carla = new ApiClient('carla')
  const registered = await carla.register(
    registration('carla', {
      displayName: 'Carla Legado',
      expertise: 'curioso',
      migrateAnonymousProgress: true,
    }),
  )
  assert.equal(registered.status, 201)
  assert.equal(registered.data.account.onboardingStatus, 'completed')
  assert.equal(registered.data.account.hasProgress, true)

  const imported = await carla.get('/api/progress')
  assert.equal(imported.status, 200)
  assert.deepEqual(imported.data.progress, legacyFixture())

  const setupAfter = await fetch(`${baseUrl}/api/setup`)
  const afterBody = await setupAfter.json()
  assert.equal(afterBody.hasAnonymousProgress, false)
  assert.equal(afterBody.anonymousProgressMigrated, true)

  const repeated = await carla.post('/api/account/import-anonymous', {})
  assert.equal(repeated.status, 200)
  assert.deepEqual(repeated.data.progress, legacyFixture())
  assert.equal(repeated.data.account.hasProgress, true)

  const foreign = await brunoClient.post('/api/account/import-anonymous', {})
  assert.equal(foreign.status, 409)
  assert.equal(foreign.data.code, 'ANONYMOUS_ALREADY_MIGRATED')

  const unavailable = await new ApiClient('dora').register(
    registration('dora', { migrateAnonymousProgress: true }),
  )
  assert.equal(unavailable.status, 409)
  assert.equal(unavailable.data.code, 'ANONYMOUS_PROGRESS_UNAVAILABLE')

  const brunoView = await brunoClient.get('/api/progress')
  assert.deepEqual(brunoView.data.progress, brunoProgress)
})

test('recuperação local troca a senha, invalida sessões e renova o código', async () => {
  const dave = new ApiClient('dave')
  const registered = await dave.register(registration('dave', { displayName: 'Dave Local' }))
  assert.equal(registered.status, 201)
  const firstCode = registered.data.recoveryCode
  assert.ok(dave.cookie)

  const mismatch = await dave.post('/api/auth/recover', {
    username: 'dave',
    recoveryCode: firstCode,
    newPassword: NEW_PASSWORD,
    confirmPassword: 'senha-divergente',
  })
  assert.equal(mismatch.status, 400)

  const recovered = await dave.post('/api/auth/recover', {
    username: 'dave',
    recoveryCode: firstCode,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  })
  assert.equal(recovered.status, 200)
  assert.match(recovered.data.recoveryCode, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  assert.notEqual(recovered.data.recoveryCode, firstCode)
  assert.equal(JSON.stringify(recovered.data).includes('scrypt$'), false)

  const expired = await dave.get('/api/auth/session')
  assert.equal(expired.status, 401)

  const oldLogin = await dave.login({ username: 'dave', password: PASSWORD })
  assert.equal(oldLogin.status, 401)

  const newLogin = await dave.login({ username: 'dave', password: NEW_PASSWORD })
  assert.equal(newLogin.status, 200)
  assert.ok(dave.cookie)
  assert.equal(newLogin.data.account.username, 'dave')

  const staleCode = await new ApiClient('dave-antigo').post('/api/auth/recover', {
    username: 'dave',
    recoveryCode: firstCode,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  })
  assert.equal(staleCode.status, 401)

  const recoveredAgain = await dave.post('/api/auth/recover', {
    username: 'dave',
    recoveryCode: recovered.data.recoveryCode,
    newPassword: PASSWORD,
    confirmPassword: PASSWORD,
  })
  assert.equal(recoveredAgain.status, 200)

  const finalLogin = await dave.login({ username: 'dave', password: PASSWORD })
  assert.equal(finalLogin.status, 200)
})

test('administração autoriza papéis, protege o último admin e libera conteúdo', async () => {
  const anonymous = await fetch(`${baseUrl}/api/admin/overview`)
  assert.equal(anonymous.status, 401)
  const anonymousElevate = await fetch(`${baseUrl}/api/admin/elevate`, { method: 'POST' })
  assert.equal(anonymousElevate.status, 401)

  const forbidden = await brunoClient.get('/api/admin/overview')
  assert.equal(forbidden.status, 403)
  assert.equal(forbidden.data.code, 'FORBIDDEN')

  const overview = await anaClient.get('/api/admin/overview')
  assert.equal(overview.status, 200)
  assert.equal(overview.data.schemaVersion, 3)
  assert.equal(overview.data.adminCount, 1)
  assert.ok(
    overview.data.accounts.some(
      (account) => account.username === 'ana.local' && account.role === 'admin',
    ),
  )
  assert.ok(
    overview.data.accounts.some(
      (account) => account.username === 'membro' && account.role === 'member',
    ),
  )
  const serializedOverview = JSON.stringify(overview.data)
  assert.equal(serializedOverview.includes('passwordHash'), false)
  assert.equal(serializedOverview.includes('recoveryHash'), false)
  assert.equal(serializedOverview.includes('scrypt$'), false)

  const lastAdmin = await anaClient.patch(`/api/admin/accounts/${anaAccountId}/role`, {
    role: 'member',
  })
  assert.equal(lastAdmin.status, 409)
  assert.equal(lastAdmin.data.code, 'LAST_ADMIN')

  const brunoSession = await brunoClient.get('/api/auth/session')
  const brunoAccountId = brunoSession.data.account.id
  const promoted = await anaClient.patch(`/api/admin/accounts/${brunoAccountId}/role`, {
    role: 'admin',
  })
  assert.equal(promoted.status, 200)
  assert.equal(promoted.data.account.role, 'admin')

  const brunoAsAdmin = await brunoClient.get('/api/auth/session')
  assert.equal(brunoAsAdmin.data.account.role, 'admin')
  assert.equal(brunoAsAdmin.data.account.isAdmin, true)
  assert.equal((await brunoClient.get('/api/admin/overview')).status, 200)

  const selfDemote = await anaClient.patch(`/api/admin/accounts/${anaAccountId}/role`, {
    role: 'member',
  })
  assert.equal(selfDemote.status, 200)
  assert.equal(selfDemote.data.account.role, 'member')
  const deniedAfterDemote = await anaClient.get('/api/admin/overview')
  assert.equal(deniedAfterDemote.status, 403)
  assert.equal(deniedAfterDemote.data.code, 'FORBIDDEN')

  const restoredAdmin = await brunoClient.patch(`/api/admin/accounts/${anaAccountId}/role`, {
    role: 'admin',
  })
  assert.equal(restoredAdmin.status, 200)
  assert.equal(restoredAdmin.data.account.role, 'admin')

  const invalidRole = await anaClient.patch(`/api/admin/accounts/${membroAccountId}/role`, {
    role: 'proprietario',
  })
  assert.equal(invalidRole.status, 400)
  assert.equal(invalidRole.data.code, 'INVALID_ROLE')

  const missingAccount = await anaClient.patch('/api/admin/accounts/inexistente/role', {
    role: 'member',
  })
  assert.equal(missingAccount.status, 404)
  assert.equal(missingAccount.data.code, 'ACCOUNT_NOT_FOUND')

  // O papel administrativo ignora nível e pré-requisitos na própria conta.
  const bypassState = addCase(anaProgress, 'portal-fora-do-ar')
  const adminSave = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: bypassState,
  })
  assert.equal(adminSave.status, 200)
  const savedBypass = await anaClient.get('/api/progress')
  assert.deepEqual(savedBypass.data.progress, bypassState)

  // O bypass não autoriza gravar no progresso de outra conta.
  const foreignWrite = await anaClient.put('/api/progress', {
    accountId: membroAccountId,
    progress: bypassState,
  })
  assert.equal(foreignWrite.status, 409)
  assert.equal(foreignWrite.data.code, 'ACCOUNT_MISMATCH')

  // Restaura o estado usado pelos testes anteriores de isolamento.
  const restoredProgress = await anaClient.put('/api/progress', {
    accountId: anaAccountId,
    progress: anaProgress,
  })
  assert.equal(restoredProgress.status, 200)

  const membroDenied = await membroClient.get('/api/admin/overview')
  assert.equal(membroDenied.status, 403)

  // Qualquer conta autenticada pode se tornar administradora pela própria página /admin.
  const elevated = await membroClient.post('/api/admin/elevate')
  assert.equal(elevated.status, 200)
  assert.equal(elevated.data.alreadyAdmin, false)
  assert.equal(elevated.data.account.role, 'admin')
  assert.equal(elevated.data.account.isAdmin, true)
  const membroSessionAfterElevate = await membroClient.get('/api/auth/session')
  assert.equal(membroSessionAfterElevate.data.account.role, 'admin')
  assert.equal((await membroClient.get('/api/admin/overview')).status, 200)

  const elevatedAgain = await membroClient.post('/api/admin/elevate')
  assert.equal(elevatedAgain.status, 200)
  assert.equal(elevatedAgain.data.alreadyAdmin, true)

  const demotedBack = await anaClient.patch(`/api/admin/accounts/${membroAccountId}/role`, {
    role: 'member',
  })
  assert.equal(demotedBack.status, 200)
  assert.equal(demotedBack.data.account.role, 'member')
  const membroDeniedAgain = await membroClient.get('/api/admin/overview')
  assert.equal(membroDeniedAgain.status, 403)
  assert.equal(membroDeniedAgain.data.code, 'FORBIDDEN')
})

test('logout, CSRF local, CORS e rotas desconhecidas continuam restritos', async () => {
  const foreignOrigin = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Origin: 'https://exemplo-malicioso.test', Cookie: anaClient.cookie },
  })
  assert.equal(foreignOrigin.status, 403)

  const logout = await anaClient.post('/api/auth/logout', {})
  assert.equal(logout.status, 200)
  assert.match(logout.setCookie, /Max-Age=0/)
  assert.match(logout.setCookie, /SameSite=Strict/)

  const anaAfterLogout = await anaClient.get('/api/progress')
  assert.equal(anaAfterLogout.status, 401)
  assert.equal(anaAfterLogout.data.code, 'UNAUTHORIZED')

  const brunoAfterAnaLogout = await brunoClient.get('/api/progress')
  assert.equal(brunoAfterAnaLogout.status, 200)
  assert.deepEqual(brunoAfterAnaLogout.data.progress, brunoProgress)

  const allowed = await fetch(`${baseUrl}/api/progress`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:5173',
      'Access-Control-Request-Method': 'PUT',
    },
  })
  assert.equal(allowed.status, 204)
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173')

  const blocked = await fetch(`${baseUrl}/api/progress`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://exemplo-malicioso.test',
      'Access-Control-Request-Method': 'PUT',
    },
  })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.headers.get('access-control-allow-origin'), null)

  const unknown = await fetch(`${baseUrl}/api/desconhecida`)
  assert.equal(unknown.status, 404)

  const root = await fetch(`${baseUrl}/`)
  assert.equal(root.status, 200)
  const rootBody = await root.json()
  assert.equal(rootBody.app, 'PeritSec')
  assert.equal(rootBody.health, '/api/health')
})
