export type CompetencyId = 'redes' | 'diagnostico' | 'seguranca' | 'forense' | 'cripto'

export interface Competency {
  id: CompetencyId
  label: string
  short: string
  description: string
}

export const COMPETENCIES: Competency[] = [
  {
    id: 'redes',
    label: 'Fundamentos de redes',
    short: 'Redes',
    description: 'Explicar endereçamento, protocolos, caminhos e serviços a partir de evidências técnicas.',
  },
  {
    id: 'diagnostico',
    label: 'Diagnóstico e troubleshooting',
    short: 'Diagnóstico',
    description: 'Formular hipóteses, executar testes em ordem coerente e localizar a causa de uma falha.',
  },
  {
    id: 'seguranca',
    label: 'Análise de segurança',
    short: 'Segurança',
    description: 'Ler logs e tráfego, reconhecer anomalias e distinguir correlação de conclusão.',
  },
  {
    id: 'forense',
    label: 'Método pericial',
    short: 'Perícia',
    description: 'Preservar integridade, documentar procedimentos, correlacionar fontes e comunicar limites.',
  },
  {
    id: 'cripto',
    label: 'Criptografia aplicada',
    short: 'Criptografia',
    description: 'Diferenciar codificação, hash e cifra; calcular transformações e reconhecer limites de recuperação.',
  },
]

export type ActivityType = 'exercicio' | 'licao' | 'laboratorio' | 'caso' | 'sistema'

export interface ActivityItem {
  id: string
  at: string
  type: ActivityType
  label: string
  detail?: string
  href?: string
}

export interface ExerciseRecord {
  lessonId: string
  competency: CompetencyId
  passed: boolean
  attempts: number
  bestScore: number
  hintsUsed: number
  lastAt: string
}

export interface LessonRecord {
  competency: CompetencyId
  completedAt: string
  score: number
}

export interface LabRecord {
  competency: CompetencyId
  completedAt: string
  score: number
  label: string
}

export interface CaseReport {
  facts: string
  inference: string
  limitations: string
  recommendations: string
}

export interface CaseBreakdownItem {
  id: string
  label: string
  earned: number
  max: number
  met: boolean
  feedback: string
}

export interface CaseSubmission {
  score: number
  passed: boolean
  at: string
  breakdown: CaseBreakdownItem[]
}

export type HypothesisVerdict = 'supported' | 'refuted' | 'insufficient'

export interface CaseProgress {
  evidenceOpened: string[]
  notes: Record<string, string>
  evidenceSelection: string[]
  timeline: string[]
  hypotheses: Record<string, HypothesisVerdict | ''>
  conclusionId: string
  confidence: '' | 'alta' | 'media' | 'baixa'
  unsupportedClaimId: string
  report: CaseReport
  submitted?: CaseSubmission
  actions: Array<{ at: string; label: string }>
}

export interface ProgressState {
  version: 1
  exercises: Record<string, ExerciseRecord>
  lessons: Record<string, LessonRecord>
  labs: Record<string, LabRecord>
  cases: Record<string, CaseProgress>
  activity: ActivityItem[]
}

export const STORAGE_KEY = 'peritsec:progress:v1'
export const STORAGE_UPDATED_KEY = 'peritsec:progress:updatedAt:v1'

export function createEmptyProgress(): ProgressState {
  return {
    version: 1,
    exercises: {},
    lessons: {},
    labs: {},
    cases: {},
    activity: [],
  }
}

export function createEmptyCaseProgress(): CaseProgress {
  return {
    evidenceOpened: [],
    notes: {},
    evidenceSelection: [],
    timeline: [],
    hypotheses: {},
    conclusionId: '',
    confidence: '',
    unsupportedClaimId: '',
    report: { facts: '', inference: '', limitations: '', recommendations: '' },
    actions: [],
  }
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function pushActivity(
  state: ProgressState,
  activity: Omit<ActivityItem, 'id' | 'at'>,
  at = nowIso(),
): ProgressState {
  return {
    ...state,
    activity: [
      { ...activity, id: createId('act'), at },
      ...state.activity,
    ].slice(0, 80),
  }
}

export interface ExerciseAttemptInput {
  exerciseId: string
  lessonId: string
  competency: CompetencyId
  passed: boolean
  score: number
  hintsUsed: number
}

export function applyExerciseAttempt(
  state: ProgressState,
  input: ExerciseAttemptInput,
  at = nowIso(),
): { state: ProgressState; firstPass: boolean } {
  const previous = state.exercises[input.exerciseId]
  const firstPass = Boolean(input.passed && !previous?.passed)
  const record: ExerciseRecord = {
    lessonId: input.lessonId,
    competency: input.competency,
    passed: Boolean(previous?.passed || input.passed),
    attempts: (previous?.attempts ?? 0) + 1,
    bestScore: Math.max(previous?.bestScore ?? 0, input.score),
    hintsUsed: Math.max(previous?.hintsUsed ?? 0, input.hintsUsed),
    lastAt: at,
  }
  let next: ProgressState = {
    ...state,
    exercises: { ...state.exercises, [input.exerciseId]: record },
  }
  if (firstPass) {
    next = pushActivity(
      next,
      {
        type: 'exercicio',
        label: 'Exercício resolvido',
        detail: firstPass ? 'Competência demonstrada em uma nova atividade.' : undefined,
      },
      at,
    )
  }
  return { state: next, firstPass }
}

export function applyLessonCompletion(
  state: ProgressState,
  input: { lessonId: string; competency: CompetencyId; score: number; label: string },
  at = nowIso(),
): ProgressState {
  if (state.lessons[input.lessonId]) return state
  const next: ProgressState = {
    ...state,
    lessons: {
      ...state.lessons,
      [input.lessonId]: {
        competency: input.competency,
        completedAt: at,
        score: input.score,
      },
    },
  }
  return pushActivity(
    next,
    {
      type: 'licao',
      label: `Lição concluída: ${input.label}`,
      detail: 'Todos os exercícios da unidade foram resolvidos.',
      href: `/licoes/${input.lessonId}`,
    },
    at,
  )
}

export function applyLabCompletion(
  state: ProgressState,
  input: { labId: string; competency: CompetencyId; score: number; label: string },
  at = nowIso(),
): ProgressState {
  if (state.labs[input.labId]) return state
  const next: ProgressState = {
    ...state,
    labs: {
      ...state.labs,
      [input.labId]: {
        competency: input.competency,
        completedAt: at,
        score: input.score,
        label: input.label,
      },
    },
  }
  return pushActivity(
    next,
    {
      type: 'laboratorio',
      label: `Laboratório concluído: ${input.label}`,
      detail: 'Objetivo técnico verificado pelo motor de simulação.',
      href: '/laboratorios',
    },
    at,
  )
}

export function getCaseProgress(state: ProgressState, caseId: string): CaseProgress {
  return state.cases[caseId] ?? createEmptyCaseProgress()
}

export function updateCaseProgress(
  state: ProgressState,
  caseId: string,
  updater: (current: CaseProgress) => CaseProgress,
  actionLabel?: string,
  at = nowIso(),
): ProgressState {
  const current = getCaseProgress(state, caseId)
  const updated = updater(current)
  const withAction = actionLabel
    ? {
        ...updated,
        actions: [...updated.actions, { at, label: actionLabel }].slice(-80),
      }
    : updated
  let next: ProgressState = {
    ...state,
    cases: { ...state.cases, [caseId]: withAction },
  }
  if (actionLabel) {
    next = pushActivity(
      next,
      {
        type: 'caso',
        label: actionLabel,
        detail: `Caso em análise · ${caseId}`,
        href: `/casos/${caseId}`,
      },
      at,
    )
  }
  return next
}

export function recordCaseSubmission(
  state: ProgressState,
  caseId: string,
  submission: CaseSubmission,
  caseTitle: string,
  at = nowIso(),
): ProgressState {
  const current = getCaseProgress(state, caseId)
  let next: ProgressState = {
    ...state,
    cases: {
      ...state.cases,
      [caseId]: {
        ...current,
        submitted: submission,
        actions: [...current.actions, { at, label: 'Relatório pericial submetido para avaliação.' }].slice(-80),
      },
    },
  }
  next = pushActivity(
    next,
    {
      type: 'caso',
      label: `Relatório submetido: ${caseTitle}`,
      detail: `${submission.score} / 100 · ${submission.passed ? 'critérios mínimos atingidos' : 'revisão recomendada'}`,
      href: `/casos/${caseId}`,
    },
    at,
  )
  return next
}

export function resetCaseProgress(state: ProgressState, caseId: string): ProgressState {
  const cases = { ...state.cases }
  delete cases[caseId]
  return pushActivity(
    { ...state, cases },
    {
      type: 'sistema',
      label: 'Análise de caso reiniciada',
      detail: `Caso ${caseId}`,
    },
  )
}

export function competencyPoints(state: ProgressState, competency: CompetencyId): number {
  let points = 0
  for (const record of Object.values(state.exercises)) {
    if (record.competency === competency && record.passed) points += 6
  }
  for (const record of Object.values(state.lessons)) {
    if (record.competency === competency) points += 10
  }
  for (const record of Object.values(state.labs)) {
    if (record.competency === competency) points += 20
  }
  if (competency === 'forense') {
    for (const record of Object.values(state.cases)) {
      if (!record.submitted) continue
      points += Math.round(record.submitted.score * 0.3)
    }
  }
  return Math.min(100, points)
}

export type CompetencyLevel = 'nao-iniciado' | 'em-desenvolvimento' | 'consolidando' | 'demonstrado'

export function competencyLevel(points: number): { id: CompetencyLevel; label: string } {
  if (points <= 0) return { id: 'nao-iniciado', label: 'Não iniciado' }
  if (points < 35) return { id: 'em-desenvolvimento', label: 'Em desenvolvimento' }
  if (points < 65) return { id: 'consolidando', label: 'Consolidando' }
  return { id: 'demonstrado', label: 'Demonstrado' }
}

export function completedExerciseCount(state: ProgressState): number {
  return Object.values(state.exercises).filter((record) => record.passed).length
}

export function submittedCaseCount(state: ProgressState): number {
  return Object.values(state.cases).filter((record) => record.submitted).length
}

export function submittedCaseAverage(state: ProgressState): number | null {
  const scores = Object.values(state.cases)
    .map((record) => record.submitted?.score)
    .filter((score): score is number => typeof score === 'number')
  if (scores.length === 0) return null
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
}

export function sanitizeProgress(candidate: unknown): ProgressState | null {
  if (!candidate || typeof candidate !== 'object') return null
  const record = candidate as Partial<ProgressState>
  if (record.version !== 1) return null
  if (
    typeof record.exercises !== 'object' ||
    typeof record.lessons !== 'object' ||
    typeof record.labs !== 'object' ||
    typeof record.cases !== 'object' ||
    !Array.isArray(record.activity)
  ) {
    return null
  }
  return {
    version: 1,
    exercises: record.exercises as Record<string, ExerciseRecord>,
    lessons: record.lessons as Record<string, LessonRecord>,
    labs: record.labs as Record<string, LabRecord>,
    cases: record.cases as Record<string, CaseProgress>,
    activity: record.activity as ActivityItem[],
  }
}

export function loadProgress(): ProgressState {
  if (typeof localStorage === 'undefined') return createEmptyProgress()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyProgress()
    const parsed = sanitizeProgress(JSON.parse(raw))
    return parsed ?? createEmptyProgress()
  } catch {
    return createEmptyProgress()
  }
}

export function loadProgressUpdatedAt(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const value = localStorage.getItem(STORAGE_UPDATED_KEY)
    return value && !Number.isNaN(new Date(value).getTime()) ? value : null
  } catch {
    return null
  }
}

export function saveProgress(state: ProgressState): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(STORAGE_UPDATED_KEY, new Date().toISOString())
    return true
  } catch {
    return false
  }
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}
