export type ExpertiseId = 'iniciante' | 'curioso' | 'intermediario' | 'avancado'
export type ContentType = 'lesson' | 'lab' | 'case'

export interface ExpertiseLevel {
  id: ExpertiseId
  label: string
  rank: number
  description: string
}

export interface Skill {
  id: string
  label: string
  description: string
}

export interface ContentRule {
  id: string
  type: ContentType
  title: string
  summary: string
  minLevel: ExpertiseId
  requires: string[]
  requiresSkills: string[]
  teaches: string[]
  order: number
  href: string
  completion?: { kind: 'prefix'; prefix: string; count: number }
}

export interface MissingContent {
  id: string
  title: string
  type: ContentType
  href: string | null
}

export interface MissingSkill {
  id: string
  label: string
}

export interface ContentAccess {
  id: string
  title?: string
  type?: ContentType
  href?: string
  minLevel?: ExpertiseId
  requiredRank?: number
  effectiveLevel: ExpertiseLevel
  levelAllowed: boolean
  adminBypass: boolean
  completed: boolean
  inProgress: boolean
  historical: boolean
  allowed: boolean
  accessible: boolean
  canStart: boolean
  missingContent: MissingContent[]
  missingSkills: MissingSkill[]
  reason: string
  recommendation?: 'retomar' | 'proximo' | 'revisar'
}

export interface AccessOptions {
  /** Acesso administrativo: ignora nível e pré-requisitos. */
  admin?: boolean
  /** Avalia como se não houvesse histórico registrado. */
  ignoreHistory?: boolean
}

export interface TrackAccess {
  trackId: string
  minLevel?: ExpertiseId
  requiredRank?: number
  effectiveLevel?: ExpertiseLevel
  allowed: boolean
  accessible: boolean
  reason: string
}

export interface ProgressLike {
  version?: number
  exercises?: Record<string, unknown>
  lessons?: Record<string, unknown>
  labs?: Record<string, unknown>
  cases?: Record<string, unknown>
  activity?: unknown[]
}

export const EXPERTISE_LEVELS: ExpertiseLevel[]
export const EXPERTISE_IDS: ExpertiseId[]
export const SKILLS: Skill[]
export const SKILLS_BY_ID: Record<string, Skill>
export const DEMONSTRATED_LEVELS: Array<{ rank: number; skills: string[] }>
export const TRACK_RULES: Record<string, { minLevel: ExpertiseId; order: number }>
export const CONTENT_RULES: Record<string, ContentRule>
export const RECOMMENDATION_ORDER: Record<ExpertiseId, string[]>

export function getExpertise(id: string): ExpertiseLevel | null
export function getExpertiseRank(id: string): number
export function hasContentRecord(progress: ProgressLike, contentId: string): boolean
export function isContentComplete(progress: ProgressLike, contentId: string): boolean
export function isContentInProgress(progress: ProgressLike, contentId: string): boolean
export function demonstratedSkills(progress: ProgressLike): Set<string>
export function demonstratedExpertise(progress: ProgressLike): ExpertiseLevel
export function effectiveExpertise(initialExpertise: ExpertiseId, progress: ProgressLike): ExpertiseLevel
export function missingSkillLabels(skillIds: string[]): string[]
export function evaluateContentAccess(
  contentId: string,
  expertise: ExpertiseId,
  progress: ProgressLike,
  options?: AccessOptions,
): ContentAccess
export function getTrackAccess(
  trackId: string,
  expertise: ExpertiseId,
  progress: ProgressLike,
  options?: AccessOptions,
): TrackAccess
export function recommendNextActivity(
  expertise: ExpertiseId,
  progress: ProgressLike,
  options?: AccessOptions,
): (ContentAccess & { recommendation: 'retomar' | 'proximo' | 'revisar' }) | null
export function progressHasEvidence(progress: ProgressLike): boolean
export function contentRuleSummary(contentId: string):
  | {
      id: string
      type: ContentType
      title: string
      summary: string
      minLevel: ExpertiseId
      href: string
      requires: MissingContent[]
      requiresSkills: MissingSkill[]
    }
  | null
export function validateProgressAccess(
  previous: ProgressLike,
  next: ProgressLike,
  expertise: ExpertiseId,
  options?: AccessOptions,
): Array<{
  contentId: string
  reason: string
  missingContent: string[]
  missingSkills: string[]
}>
