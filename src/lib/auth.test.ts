import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAuthSession,
  importAnonymousProgressRequest,
  loginRequest,
  registerRequest,
  regenerateRecoveryCodeRequest,
} from './auth'

const at = '2026-10-20T10:00:00.000Z'

const account = {
  id: 'conta-1',
  username: 'ana',
  displayName: 'Ana',
  expertise: 'iniciante' as const,
  initialExpertise: 'iniciante' as const,
  onboardingStatus: 'completed' as const,
  onboardingStartedAt: at,
  onboardingCompletedAt: at,
  createdAt: at,
  updatedAt: at,
}

function response(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as unknown as Response
}

function installFetch(status: number, data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(response(status, data))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cliente de autenticação local', () => {
  it('envia a intenção explícita de migrar o progresso anônimo no cadastro', async () => {
    const fetchMock = installFetch(201, {
      account,
      session: { expiresAt: at, policy: { days: 30, label: '30 dias a partir do login' } },
      recoveryCode: 'ABCD-EFGH-JKLM',
      recoveryNotice: 'Guarde este código.',
    })

    const result = await registerRequest({
      displayName: 'Ana',
      username: 'ana',
      password: 'SenhaLocal#2026',
      confirmPassword: 'SenhaLocal#2026',
      expertise: 'iniciante',
      migrateAnonymousProgress: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.recoveryCode).toBe('ABCD-EFGH-JKLM')
    expect(result.data.account.onboardingStatus).toBe('completed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/auth/register')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(String(init.body))).toMatchObject({
      username: 'ana',
      migrateAnonymousProgress: true,
    })
  })

  it('importa o progresso anterior por uma rota autenticada e única', async () => {
    const fetchMock = installFetch(200, {
      ok: true,
      progress: {
        version: 1,
        exercises: {},
        lessons: { 'caminho-do-pacote': { completedAt: at } },
        labs: {},
        cases: {},
        activity: [],
      },
      updatedAt: at,
      account: { ...account, hasProgress: true },
    })

    const result = await importAnonymousProgressRequest()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.account.hasProgress).toBe(true)
    expect(result.data.progress).toBeTruthy()
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/account/import-anonymous')
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('include')
    expect(init.body).toBe('{}')
  })

  it('mantém erros de migração identificáveis para a interface', async () => {
    installFetch(409, {
      error: 'O progresso anterior já foi associado a uma conta.',
      code: 'ANONYMOUS_ALREADY_MIGRATED',
    })

    const result = await importAnonymousProgressRequest()

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      code: 'ANONYMOUS_ALREADY_MIGRATED',
    })
  })

  it('rejeita resposta de sessão incompleta em vez de aceitar dados parciais', async () => {
    installFetch(200, { account: { id: 'conta-1' }, session: {} })

    const result = await fetchAuthSession()

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Resposta de sessão inválida')
  })

  it('preserva a mensagem e o código de uma senha incorreta', async () => {
    installFetch(401, { error: 'Usuário ou senha inválidos.' })

    const result = await loginRequest({ username: 'ana', password: 'incorreta' })

    expect(result).toMatchObject({
      ok: false,
      status: 401,
      unauthorized: true,
      error: 'Usuário ou senha inválidos.',
    })
  })

  it('solicita um novo código de recuperação sem expor hash', async () => {
    installFetch(200, {
      ok: true,
      recoveryCode: 'NOVO-CODIGO-AQUI',
      notice: 'O código anterior deixou de funcionar.',
    })

    const result = await regenerateRecoveryCodeRequest()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.recoveryCode).toBe('NOVO-CODIGO-AQUI')
    expect(JSON.stringify(result.data)).not.toContain('scrypt$')
  })
})
