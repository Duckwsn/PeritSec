import {
  CONTENT_RULES,
  EXPERTISE_LEVELS,
  SKILLS,
  SKILLS_BY_ID,
  TRACK_RULES,
  contentRuleSummary,
  demonstratedSkills,
  effectiveExpertise,
  evaluateContentAccess,
  getExpertise,
  getTrackAccess,
  progressHasEvidence,
  recommendNextActivity,
  validateProgressAccess,
  type ContentAccess,
  type ContentType,
  type ExpertiseId,
  type ExpertiseLevel,
  type TrackAccess,
} from '../../shared/progression.mjs'
import type { ProgressState } from './progress'

export { CONTENT_RULES, EXPERTISE_LEVELS, SKILLS, SKILLS_BY_ID, TRACK_RULES }
export type { ContentAccess, ContentType, ExpertiseId, ExpertiseLevel, TrackAccess }

export type ProgressionAccess = ContentAccess

export interface AccessOptions {
  admin?: boolean
}

export function accessForContent(
  contentId: string,
  expertise: ExpertiseId,
  progress: ProgressState,
  options: AccessOptions = {},
): ContentAccess {
  return evaluateContentAccess(contentId, expertise, progress, options)
}

export function accessForTrack(
  trackId: string,
  expertise: ExpertiseId,
  progress: ProgressState,
  options: AccessOptions = {},
): TrackAccess {
  return getTrackAccess(trackId, expertise, progress, options)
}

export function nextActivity(
  expertise: ExpertiseId,
  progress: ProgressState,
  options: AccessOptions = {},
) {
  return recommendNextActivity(expertise, progress, options)
}

export function effectiveLevel(expertise: ExpertiseId, progress: ProgressState): ExpertiseLevel {
  return effectiveExpertise(expertise, progress)
}

export function skillEvidence(progress: ProgressState): Set<string> {
  return demonstratedSkills(progress)
}

export function hasEvidence(progress: ProgressState): boolean {
  return progressHasEvidence(progress)
}

export function accessValidation(
  previous: ProgressState | null,
  next: ProgressState,
  expertise: ExpertiseId,
  options: AccessOptions = {},
) {
  return validateProgressAccess(previous ?? {}, next, expertise, options)
}

export function contentInfo(contentId: string) {
  return contentRuleSummary(contentId)
}

export function contentTitle(contentId: string): string {
  return CONTENT_RULES[contentId]?.title ?? contentId
}

export function contentHref(contentId: string): string | null {
  return CONTENT_RULES[contentId]?.href ?? null
}

export function levelLabel(id: ExpertiseId | string | null | undefined): string {
  return getExpertise(String(id ?? ''))?.label ?? 'Iniciante'
}

export function levelRank(id: ExpertiseId | string | null | undefined): number {
  return getExpertise(String(id ?? ''))?.rank ?? 1
}

export function isExpertiseId(value: unknown): value is ExpertiseId {
  return EXPERTISE_LEVELS.some((level) => level.id === value)
}

export function skillLabel(id: string): string {
  return SKILLS_BY_ID[id]?.label ?? id
}

export type BlockReason = {
  title: string
  text: string
  requirements: string[]
  next?: { label: string; href: string } | null
}

/**
 * Constrói uma explicação a partir dos pré-requisitos reais do conteúdo.
 * Não inclui gabaritos, conclusões ou respostas de exercícios.
 */
export function explainBlock(
  access: ContentAccess,
  recommendation?: ReturnType<typeof nextActivity>,
): BlockReason {
  const requirements = [
    ...access.missingSkills.map((skill) => `Competência: ${skill.label}`),
    ...access.missingContent.map((content) => `Concluir: ${content.title}`),
  ]

  if (access.reason === 'nivel') {
    const level = EXPERTISE_LEVELS.find((item) => item.id === access.minLevel)
    return {
      title: 'Conteúdo ainda não liberado',
      text: `Este conteúdo exige o nível ${level?.label ?? access.minLevel ?? 'adequado'}. Seu nível efetivo atual é ${access.effectiveLevel.label}. O nível inicial orienta o ponto de partida; o avanço é conquistado com as competências da jornada.`,
      requirements,
      next: recommendation
        ? { label: `Próximo passo: ${recommendation.title ?? recommendation.id}`, href: recommendation.href ?? '/' }
        : null,
    }
  }

  const skillText =
    access.missingSkills.length > 0
      ? ` Exige conhecimentos de ${access.missingSkills.map((skill) => skill.label).join(', ')}.`
      : ''
  const contentText =
    access.missingContent.length > 0
      ? ` Conclua ${access.missingContent.map((content) => content.title).join(', ')} para demonstrar os pré-requisitos.`
      : ''

  return {
    title: 'Pré-requisitos pendentes',
    text: `Este conteúdo depende de conhecimentos que ainda não foram demonstrados neste perfil.${skillText}${contentText}`,
    requirements,
    next: recommendation
      ? { label: `Próximo passo: ${recommendation.title ?? recommendation.id}`, href: recommendation.href ?? '/' }
      : null,
  }
}

export function trackLevelLabel(trackId: string): string {
  const rule = TRACK_RULES[trackId]
  return rule ? levelLabel(rule.minLevel) : 'Iniciante'
}

export function contentCountByType(type: ContentType): number {
  return Object.values(CONTENT_RULES).filter((rule) => rule.type === type).length
}
