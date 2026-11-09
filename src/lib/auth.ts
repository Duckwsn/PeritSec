import type { ExpertiseId, ExpertiseLevel } from './progression'

export type OnboardingStatus = 'pending' | 'started' | 'completed'
export type AccountRole = 'admin' | 'member'

export interface Account {
  id: string
  username: string
  displayName: string
  expertise: ExpertiseId
  initialExpertise: ExpertiseId
  role: AccountRole
  onboardingStatus: OnboardingStatus
  onboardingStartedAt: string | null
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
  effectiveExpertise?: ExpertiseLevel
  hasProgress?: boolean
  isAdmin?: boolean
}

export interface SessionInfo {
  expiresAt: string
  policy: { days: number; label: string }
}

export interface SetupInfo {
  app: string
  hasAccounts: boolean
  hasAnonymousProgress: boolean
  anonymousProgressMigrated: boolean
  sessionPolicy: { days: number; label: string }
  passwordPolicy: { minLength: number; hashing: string }
  localOnly: boolean
}

export interface AuthSessionPayload {
  account: Account
  session: SessionInfo
  anonymousProgressAvailable?: boolean
  dataDir?: string
}

export type ApiFailure = {
  ok: false
  error: string
  field?: string
  code?: string
  status?: number
  unavailable?: boolean
  unauthorized?: boolean
}

export type ApiSuccess<T> = { ok: true; data: T }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

const API_TIMEOUT_MS = 4500

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  if (typeof fetch !== 'function') {
    return { ok: false, error: 'Este navegador não oferece a API necessária.', unavailable: true }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
    let data: unknown = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    if (!response.ok) {
      const record = asRecord(data)
      return {
        ok: false,
        status: response.status,
        code: typeof record?.code === 'string' ? record.code : undefined,
        field: typeof record?.field === 'string' ? record.field : undefined,
        error:
          typeof record?.error === 'string' && record.error
            ? record.error
            : `A API local respondeu HTTP ${response.status}.`,
        unauthorized: response.status === 401,
        unavailable: response.status >= 500,
      }
    }
    return { ok: true, data: data as T }
  } catch {
    return {
      ok: false,
      error: 'O servidor local não respondeu. Verifique se ele está em execução.',
      unavailable: true,
    }
  } finally {
    clearTimeout(timer)
  }
}

function asSessionPayload(value: unknown): AuthSessionPayload | null {
  const record = asRecord(value)
  const account = asRecord(record?.account)
  const session = asRecord(record?.session)
  if (!record || !account || !session) return null
  if (
    typeof account.id !== 'string' ||
    typeof account.username !== 'string' ||
    typeof account.displayName !== 'string' ||
    typeof account.expertise !== 'string' ||
    typeof account.initialExpertise !== 'string' ||
    typeof account.onboardingStatus !== 'string' ||
    typeof session.expiresAt !== 'string'
  ) {
    return null
  }
  return value as unknown as AuthSessionPayload
}

export async function fetchSetup(): Promise<ApiResult<SetupInfo>> {
  return apiRequest<SetupInfo>('/api/setup')
}

export async function fetchAuthSession(): Promise<ApiResult<AuthSessionPayload>> {
  const result = await apiRequest<AuthSessionPayload>('/api/auth/session')
  if (!result.ok) return result
  const payload = asSessionPayload(result.data)
  if (!payload) return { ok: false, error: 'Resposta de sessão inválida.', unavailable: true }
  return { ok: true, data: payload }
}

export async function loginRequest(input: {
  username: string
  password: string
}): Promise<ApiResult<AuthSessionPayload>> {
  const result = await apiRequest<AuthSessionPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!result.ok) return result
  const payload = asSessionPayload(result.data)
  if (!payload) return { ok: false, error: 'Resposta de login inválida.' }
  return { ok: true, data: payload }
}

export async function registerRequest(input: {
  displayName: string
  username: string
  password: string
  confirmPassword: string
  expertise: ExpertiseId
  migrateAnonymousProgress?: boolean
}): Promise<ApiResult<AuthSessionPayload & { recoveryCode?: string; recoveryNotice?: string }>> {
  const result = await apiRequest<
    AuthSessionPayload & { recoveryCode?: string; recoveryNotice?: string }
  >('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!result.ok) return result
  const payload = asSessionPayload(result.data)
  if (!payload) return { ok: false, error: 'Resposta de cadastro inválida.' }
  return {
    ok: true,
    data: {
      ...payload,
      recoveryCode:
        typeof result.data.recoveryCode === 'string' ? result.data.recoveryCode : undefined,
      recoveryNotice:
        typeof result.data.recoveryNotice === 'string' ? result.data.recoveryNotice : undefined,
    },
  }
}

export async function logoutRequest(): Promise<ApiResult<{ ok: boolean }>> {
  return apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' })
}

export async function updateAccountRequest(input: {
  displayName?: string
  expertise?: ExpertiseId
}): Promise<ApiResult<AuthSessionPayload>> {
  const result = await apiRequest<AuthSessionPayload>('/api/account', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  if (!result.ok) return result
  const payload = asSessionPayload(result.data)
  if (!payload) return { ok: false, error: 'Resposta de conta inválida.' }
  return { ok: true, data: payload }
}

export async function onboardingRequest(
  status: 'started' | 'completed',
): Promise<ApiResult<AuthSessionPayload>> {
  const result = await apiRequest<AuthSessionPayload>('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
  if (!result.ok) return result
  const payload = asSessionPayload(result.data)
  if (!payload) return { ok: false, error: 'Resposta de onboarding inválida.' }
  return { ok: true, data: payload }
}

export async function regenerateRecoveryCodeRequest(): Promise<
  ApiResult<{ recoveryCode: string; notice: string }>
> {
  return apiRequest<{ recoveryCode: string; notice: string }>('/api/account/recovery-code', {
    method: 'POST',
    body: '{}',
  })
}

export async function recoverRequest(input: {
  username: string
  recoveryCode: string
  newPassword: string
  confirmPassword: string
}): Promise<ApiResult<{ recoveryCode: string; notice: string }>> {
  return apiRequest<{ recoveryCode: string; notice: string }>('/api/auth/recover', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function importAnonymousProgressRequest(): Promise<
  ApiResult<{ progress: unknown; updatedAt: string; account: Account }>
> {
  return apiRequest<{ progress: unknown; updatedAt: string; account: Account }>(
    '/api/account/import-anonymous',
    { method: 'POST', body: '{}' },
  )
}
