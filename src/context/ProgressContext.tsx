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
  applyExerciseAttempt,
  applyLabCompletion,
  applyLessonCompletion,
  createEmptyProgress,
  recordCaseSubmission,
  resetCaseProgress,
  updateCaseProgress,
  type CaseProgress,
  type CaseSubmission,
  type CompetencyId,
  type ExerciseAttemptInput,
  type ProgressState,
} from '../lib/progress'
import {
  createRemoteBackup,
  fetchRemoteProgress,
  listRemoteBackups,
  restoreRemoteBackup,
  saveRemoteProgress,
  type BackupSummary,
  type StorageMode,
} from '../lib/storage'
import { useAuth } from './AuthContext'

interface ProgressContextValue {
  progress: ProgressState
  storageAvailable: boolean
  storageMode: StorageMode
  storageDataDir: string | null
  storageUpdatedAt: string | null
  storageError: string | null
  backupNow: () => Promise<{ ok: boolean; backup?: BackupSummary; error?: string }>
  listBackups: () => Promise<BackupSummary[]>
  restoreBackup: (id: number) => Promise<{ ok: boolean; error?: string }>
  reload: () => Promise<void>
  recordExercise: (input: ExerciseAttemptInput) => void
  completeLesson: (input: {
    lessonId: string
    competency: CompetencyId
    score: number
    label: string
  }) => void
  completeLab: (input: {
    labId: string
    competency: CompetencyId
    score: number
    label: string
  }) => void
  updateCase: (
    caseId: string,
    updater: (current: CaseProgress) => CaseProgress,
    actionLabel?: string,
  ) => void
  submitCase: (input: {
    caseId: string
    caseTitle: string
    submission: CaseSubmission
  }) => void
  resetCase: (caseId: string) => void
  resetAll: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { account, loading: authLoading, expireSession } = useAuth()
  const [progress, setProgress] = useState<ProgressState>(() => createEmptyProgress())
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [storageMode, setStorageMode] = useState<StorageMode>('checking')
  const [storageDataDir, setStorageDataDir] = useState<string | null>(null)
  const [storageUpdatedAt, setStorageUpdatedAt] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const accountId = account?.id ?? null

  const hydrate = useCallback(async () => {
    if (authLoading) return
    if (!accountId) {
      setProgress(createEmptyProgress())
      setStorageMode('checking')
      setStorageDataDir(null)
      setStorageUpdatedAt(null)
      setStorageError(null)
      setHydrated(false)
      return
    }

    setHydrated(false)
    setStorageMode('checking')
    const remote = await fetchRemoteProgress()
    if (remote.status === 'ok') {
      setProgress(remote.progress)
      setStorageMode('sqlite')
      setStorageDataDir(remote.dataDir)
      setStorageUpdatedAt(remote.updatedAt)
      setStorageAvailable(true)
      setStorageError(null)
      setHydrated(true)
      return
    }
    if (remote.status === 'empty') {
      setProgress(createEmptyProgress())
      setStorageMode('sqlite')
      setStorageDataDir(remote.dataDir)
      setStorageUpdatedAt(null)
      setStorageAvailable(true)
      setStorageError(null)
      setHydrated(true)
      return
    }
    if (remote.status === 'unauthorized') {
      setProgress(createEmptyProgress())
      setStorageMode('checking')
      setStorageUpdatedAt(null)
      setStorageError(remote.error)
      setHydrated(false)
      expireSession('Sua sessão expirou. Entre novamente para continuar.')
      return
    }
    setProgress(createEmptyProgress())
    setStorageMode('local')
    setStorageAvailable(false)
    setStorageError(remote.error)
    setStorageUpdatedAt(null)
    setHydrated(false)
  }, [accountId, authLoading, expireSession])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (!cancelled) await hydrate()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [hydrate])

  useEffect(() => {
    if (!hydrated || !accountId || storageMode !== 'sqlite') return

    const timer = window.setTimeout(() => {
      void saveRemoteProgress(progress, accountId).then((result) => {
        if (result.ok) {
          setStorageUpdatedAt(result.updatedAt)
          setStorageAvailable(true)
          setStorageError(null)
          return
        }
        if (result.unauthorized) {
          expireSession('Sua sessão expirou antes de salvar. Entre novamente.')
          return
        }
        setStorageAvailable(false)
        setStorageError(result.error)
      })
    }, 600)

    return () => window.clearTimeout(timer)
  }, [progress, hydrated, accountId, storageMode, expireSession])

  const reload = useCallback(async () => {
    await hydrate()
  }, [hydrate])

  const backupNow = useCallback(async () => {
    const result = await createRemoteBackup()
    if (!result.ok) return { ok: false, error: result.error }
    setStorageUpdatedAt(result.backup.createdAt)
    return { ok: true, backup: result.backup }
  }, [])

  const listBackups = useCallback(() => listRemoteBackups(), [])

  const restoreBackup = useCallback(async (id: number) => {
    const result = await restoreRemoteBackup(id)
    if (!result.ok) return { ok: false, error: result.error }
    setProgress(result.progress)
    setStorageUpdatedAt(result.updatedAt)
    setStorageMode('sqlite')
    setStorageError(null)
    return { ok: true }
  }, [])

  const recordExercise = useCallback((input: ExerciseAttemptInput) => {
    setProgress((current) => applyExerciseAttempt(current, input).state)
  }, [])

  const completeLesson = useCallback(
    (input: { lessonId: string; competency: CompetencyId; score: number; label: string }) => {
      setProgress((current) => applyLessonCompletion(current, input))
    },
    [],
  )

  const completeLab = useCallback(
    (input: { labId: string; competency: CompetencyId; score: number; label: string }) => {
      setProgress((current) => applyLabCompletion(current, input))
    },
    [],
  )

  const updateCase = useCallback(
    (
      caseId: string,
      updater: (current: CaseProgress) => CaseProgress,
      actionLabel?: string,
    ) => {
      setProgress((current) => updateCaseProgress(current, caseId, updater, actionLabel))
    },
    [],
  )

  const submitCase = useCallback(
    (input: { caseId: string; caseTitle: string; submission: CaseSubmission }) => {
      setProgress((current) =>
        recordCaseSubmission(current, input.caseId, input.submission, input.caseTitle),
      )
    },
    [],
  )

  const resetCase = useCallback((caseId: string) => {
    setProgress((current) => resetCaseProgress(current, caseId))
  }, [])

  const resetAll = useCallback(() => {
    setProgress(createEmptyProgress())
    setStorageUpdatedAt(new Date().toISOString())
  }, [])

  const value = useMemo(
    () => ({
      progress,
      storageAvailable,
      storageMode,
      storageDataDir,
      storageUpdatedAt,
      storageError,
      backupNow,
      listBackups,
      restoreBackup,
      reload,
      recordExercise,
      completeLesson,
      completeLab,
      updateCase,
      submitCase,
      resetCase,
      resetAll,
    }),
    [
      progress,
      storageAvailable,
      storageMode,
      storageDataDir,
      storageUpdatedAt,
      storageError,
      backupNow,
      listBackups,
      restoreBackup,
      reload,
      recordExercise,
      completeLesson,
      completeLab,
      updateCase,
      submitCase,
      resetCase,
      resetAll,
    ],
  )

  const progressUnavailable = Boolean(accountId) && !hydrated && storageMode === 'local'
  const progressLoading = Boolean(accountId) && !hydrated && storageMode === 'checking'

  if (progressUnavailable) {
    return (
      <ProgressContext.Provider value={value}>
        <div className="storage-gate" role="alert">
          <div className="storage-gate__panel">
            <h1>O servidor local não respondeu.</h1>
            <p>
              O progresso desta conta fica no SQLite local. Sem a API, a interface não abre conteúdo
              nem grava alterações para evitar misturar contas ou simular um progresso inexistente.
            </p>
            {storageError && <p className="storage-gate__detail">{storageError}</p>}
            <button type="button" className="button button--primary" onClick={() => void reload()}>
              Verificar novamente
            </button>
          </div>
        </div>
      </ProgressContext.Provider>
    )
  }

  if (progressLoading) {
    return (
      <ProgressContext.Provider value={value}>
        <div className="auth-loading" role="status">
          <span className="auth-loading__mark" aria-hidden="true" />
          <p>Carregando o progresso desta conta…</p>
        </div>
      </ProgressContext.Provider>
    )
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('useProgress precisa ser usado dentro de ProgressProvider.')
  return context
}
