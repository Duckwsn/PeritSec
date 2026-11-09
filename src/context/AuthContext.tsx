import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchAuthSession,
  fetchSetup,
  importAnonymousProgressRequest,
  loginRequest,
  logoutRequest,
  onboardingRequest,
  recoverRequest,
  regenerateRecoveryCodeRequest,
  registerRequest,
  updateAccountRequest,
  type Account,
  type ApiResult,
  type AuthSessionPayload,
  type SessionInfo,
  type SetupInfo,
} from '../lib/auth'
import type { ExpertiseId } from '../lib/progression'

interface RecoveryReceipt {
  recoveryCode: string
  recoveryNotice?: string
  migrated: boolean
}

interface AuthContextValue {
  account: Account | null
  isAdmin: boolean
  session: SessionInfo | null
  setup: SetupInfo | null
  loading: boolean
  backendError: string | null
  sessionMessage: string | null
  recoveryReceipt: RecoveryReceipt | null
  clearRecoveryReceipt: () => void
  login: (input: { username: string; password: string }) => Promise<ApiResult<AuthSessionPayload>>
  register: (input: {
    displayName: string
    username: string
    password: string
    confirmPassword: string
    expertise: ExpertiseId
    migrateAnonymousProgress?: boolean
  }) => Promise<ApiResult<AuthSessionPayload & { recoveryCode?: string; recoveryNotice?: string }>>
  logout: () => Promise<void>
  updateProfile: (input: {
    displayName?: string
    expertise?: ExpertiseId
  }) => Promise<ApiResult<AuthSessionPayload>>
  markOnboarding: (status: 'started' | 'completed') => Promise<ApiResult<AuthSessionPayload>>
  regenerateRecoveryCode: () => ReturnType<typeof regenerateRecoveryCodeRequest>
  recoverAccess: typeof recoverRequest
  importAnonymousProgress: () => ReturnType<typeof importAnonymousProgressRequest>
  refresh: () => Promise<void>
  refreshSetup: () => Promise<void>
  expireSession: (message?: string) => void
  clearSessionMessage: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [setup, setSetup] = useState<SetupInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [recoveryReceipt, setRecoveryReceipt] = useState<RecoveryReceipt | null>(null)
  const isAdmin = account?.role === 'admin'

  const applyPayload = useCallback((payload: AuthSessionPayload) => {
    setAccount(payload.account)
    setSession(payload.session)
  }, [])

  const refreshSetup = useCallback(async () => {
    const result = await fetchSetup()
    if (result.ok) {
      setSetup(result.data)
      setBackendError(null)
    } else {
      setBackendError(result.error)
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [setupResult, sessionResult] = await Promise.all([fetchSetup(), fetchAuthSession()])
    if (setupResult.ok) {
      setSetup(setupResult.data)
      setBackendError(null)
    } else {
      setBackendError(setupResult.error)
    }
    if (sessionResult.ok) {
      applyPayload(sessionResult.data)
      setSessionMessage(null)
    } else if (sessionResult.unauthorized) {
      setAccount(null)
      setSession(null)
    } else {
      setAccount(null)
      setSession(null)
      setBackendError(sessionResult.error)
    }
    setLoading(false)
  }, [applyPayload])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(
    async (input: { username: string; password: string }) => {
      const result = await loginRequest(input)
      if (result.ok) {
        setRecoveryReceipt(null)
        applyPayload(result.data)
        setSessionMessage(null)
        await refreshSetup()
      }
      return result
    },
    [applyPayload, refreshSetup],
  )

  const register = useCallback(
    async (input: {
      displayName: string
      username: string
      password: string
      confirmPassword: string
      expertise: ExpertiseId
      migrateAnonymousProgress?: boolean
    }) => {
      const result = await registerRequest(input)
      if (result.ok) {
        if (result.data.recoveryCode) {
          setRecoveryReceipt({
            recoveryCode: result.data.recoveryCode,
            recoveryNotice: result.data.recoveryNotice,
            migrated: result.data.account.onboardingStatus === 'completed',
          })
        }
        applyPayload(result.data)
        setSessionMessage(null)
        await refreshSetup()
      }
      return result
    },
    [applyPayload, refreshSetup],
  )

  const logout = useCallback(async () => {
    await logoutRequest()
    setAccount(null)
    setSession(null)
    setSessionMessage(null)
    setRecoveryReceipt(null)
  }, [])

  const updateProfile = useCallback(
    async (input: { displayName?: string; expertise?: ExpertiseId }) => {
      const result = await updateAccountRequest(input)
      if (result.ok) applyPayload(result.data)
      return result
    },
    [applyPayload],
  )

  const markOnboarding = useCallback(
    async (status: 'started' | 'completed') => {
      if (!account) return { ok: false, error: 'Sessão não iniciada.' } as const
      if (account.onboardingStatus === 'completed') {
        return {
          ok: true,
          data: { account, session: session ?? { expiresAt: '', policy: { days: 30, label: '' } } },
        } as ApiResult<AuthSessionPayload>
      }
      const result = await onboardingRequest(status)
      if (result.ok) applyPayload(result.data)
      return result
    },
    [account, applyPayload, session],
  )

  const regenerateRecoveryCode = useCallback(() => regenerateRecoveryCodeRequest(), [])

  const recoverAccess = useCallback(
    (input: {
      username: string
      recoveryCode: string
      newPassword: string
      confirmPassword: string
    }) => recoverRequest(input),
    [],
  )

  const importAnonymousProgress = useCallback(async () => {
    const result = await importAnonymousProgressRequest()
    if (result.ok) {
      setAccount(result.data.account)
      await refreshSetup()
    }
    return result
  }, [refreshSetup])

  const expireSession = useCallback((message?: string) => {
    setAccount(null)
    setSession(null)
    setSessionMessage(message ?? 'Sua sessão expirou. Entre novamente para continuar.')
    setRecoveryReceipt(null)
  }, [])

  const clearSessionMessage = useCallback(() => setSessionMessage(null), [])
  const clearRecoveryReceipt = useCallback(() => setRecoveryReceipt(null), [])

  const value = useMemo(
    () => ({
      account,
      isAdmin,
      session,
      setup,
      loading,
      backendError,
      sessionMessage,
      recoveryReceipt,
      clearRecoveryReceipt,
      login,
      register,
      logout,
      updateProfile,
      markOnboarding,
      regenerateRecoveryCode,
      recoverAccess,
      importAnonymousProgress,
      refresh,
      refreshSetup,
      expireSession,
      clearSessionMessage,
    }),
    [
      account,
      isAdmin,
      session,
      setup,
      loading,
      backendError,
      sessionMessage,
      recoveryReceipt,
      clearRecoveryReceipt,
      login,
      register,
      logout,
      updateProfile,
      markOnboarding,
      regenerateRecoveryCode,
      recoverAccess,
      importAnonymousProgress,
      refresh,
      refreshSetup,
      expireSession,
      clearSessionMessage,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.')
  return context
}
