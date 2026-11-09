import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { EXPERTISE_IDS } from '../shared/progression.mjs'

export const SESSION_COOKIE = 'peritsec_session'
export const SESSION_POLICY = {
  days: 30,
  label: '30 dias a partir do login',
}
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 256
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/
export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 }

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function base64(buffer) {
  return Buffer.from(buffer).toString('base64')
}

function fromBase64(value) {
  return Buffer.from(value, 'base64')
}

export function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function normalizeRecoveryCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function normalizeDisplayName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function validateDisplayName(value) {
  const displayName = normalizeDisplayName(value)
  if (!displayName) return { ok: false, error: 'Informe o nome de exibição.' }
  if (displayName.length < 2) return { ok: false, error: 'O nome deve ter pelo menos 2 caracteres.' }
  if (displayName.length > 60) return { ok: false, error: 'O nome deve ter no máximo 60 caracteres.' }
  return { ok: true, displayName }
}

export function validateUsername(value) {
  const username = normalizeUsername(value)
  if (!username) return { ok: false, error: 'Informe um nome de usuário.' }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: 'Use de 3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.',
    }
  }
  return { ok: true, username }
}

export function validatePassword(value) {
  const password = String(value ?? '')
  if (!password) return { ok: false, error: 'Informe uma senha.' }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.` }
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.` }
  }
  return { ok: true, password }
}

export function validateExpertise(value) {
  if (!EXPERTISE_IDS.includes(value)) {
    return { ok: false, error: 'Selecione um nível de expertise válido.' }
  }
  return { ok: true, expertise: value }
}

export function validateRegistration(body) {
  const display = validateDisplayName(body?.displayName)
  if (!display.ok) return { ok: false, field: 'displayName', error: display.error }
  const username = validateUsername(body?.username)
  if (!username.ok) return { ok: false, field: 'username', error: username.error }
  const password = validatePassword(body?.password)
  if (!password.ok) return { ok: false, field: 'password', error: password.error }
  if (String(body?.confirmPassword ?? '') !== password.password) {
    return { ok: false, field: 'confirmPassword', error: 'As senhas não coincidem.' }
  }
  const expertise = validateExpertise(body?.expertise)
  if (!expertise.ok) return { ok: false, field: 'expertise', error: expertise.error }
  return {
    ok: true,
    displayName: display.displayName,
    username: username.username,
    password: password.password,
    expertise: expertise.expertise,
  }
}

export function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  })
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${base64(salt)}$${base64(derived)}`
}

export function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false
  const parts = encoded.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  try {
    const salt = fromBase64(parts[4])
    const expected = fromBase64(parts[5])
    const actual = scryptSync(String(password), salt, expected.length, { N, r, p })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function generateRecoveryCode() {
  const bytes = randomBytes(12)
  let raw = ''
  for (const byte of bytes) raw += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}

export function hashRecoveryCode(code) {
  return hashPassword(normalizeRecoveryCode(code))
}

export function verifyRecoveryCode(code, encoded) {
  return verifyPassword(normalizeRecoveryCode(code), encoded)
}

export function generateSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function sessionTokenHash(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex')
}

export function sessionExpiry(days = SESSION_POLICY.days) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

export function parseCookies(header) {
  const cookies = {}
  if (typeof header !== 'string' || !header) return cookies
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const name = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (!name) continue
    try {
      cookies[name] = decodeURIComponent(value)
    } catch {
      cookies[name] = value
    }
  }
  return cookies
}

export function sessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000))
  const secure = process.env.PERITSEC_SECURE_COOKIE === '1' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`
}

export function clearSessionCookie() {
  const secure = process.env.PERITSEC_SECURE_COOKIE === '1' ? '; Secure' : ''
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
}

export function createRateLimiter({ limit = 8, windowMs = 5 * 60_000 } = {}) {
  const attempts = new Map()

  function prune(now) {
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key)
    }
  }

  return {
    check(key) {
      const now = Date.now()
      prune(now)
      const entry = attempts.get(key)
      if (!entry) return { allowed: true, remaining: limit }
      if (entry.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
      }
      return { allowed: true, remaining: limit - entry.count }
    },
    fail(key) {
      const now = Date.now()
      const entry = attempts.get(key)
      if (!entry || entry.resetAt <= now) {
        attempts.set(key, { count: 1, resetAt: now + windowMs })
      } else {
        entry.count += 1
      }
    },
    reset(key) {
      attempts.delete(key)
    },
  }
}

export function isLoopbackOrigin(origin) {
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return (
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    )
  } catch {
    return false
  }
}
