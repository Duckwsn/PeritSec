import type { CompetencyId, CaseProgress, HypothesisVerdict } from './progress'

export type EvidenceKind = 'log' | 'capture' | 'change' | 'summary'

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  log: 'Registro',
  capture: 'Captura de tráfego',
  change: 'Alteração de configuração',
  summary: 'Resumo de alertas',
}

export function evidenceKindLabel(kind: EvidenceKind): string {
  return EVIDENCE_KIND_LABELS[kind]
}

export interface EvidenceItem {
  id: string
  title: string
  kind: EvidenceKind
  fileName: string
  origin: string
  clock: string
  collectedAt: string
  collectedBy: string
  method: string
  seal: string
  hash: string
  description: string
  content: string
  relevance: 'critical' | 'supporting' | 'exclusion' | 'irrelevant'
}

export interface Hypothesis {
  id: string
  label: string
  detail: string
  expected: HypothesisVerdict
  justification: string
  evidenceIds: string[]
}

export interface TimelineEvent {
  id: string
  label: string
  sourceTime: string
  normalizedTime: string
  source: string
  note: string
}

export interface CaseOption {
  id: string
  label: string
  rationale: string
}

export interface ReferenceReport {
  facts: string
  inference: string
  limitations: string
  recommendations: string
}

export interface CaseDefinition {
  id: string
  code: string
  title: string
  subtitle: string
  difficulty: 'intermediario' | 'avancado'
  durationMinutes: number
  competencies: CompetencyId[]
  context: string[]
  scope: string
  objectives: string[]
  constraints: string[]
  evidence: EvidenceItem[]
  evidenceSelectionPrompt: string
  evidenceSelectionCorrectIds: string[]
  hypotheses: Hypothesis[]
  timeline: TimelineEvent[]
  conclusionOptions: CaseOption[]
  correctConclusionId: string
  unsupportedClaimOptions: CaseOption[]
  unsupportedClaimId: string
  referenceReport: ReferenceReport
  reportGuidance: {
    facts: string
    inference: string
    limitations: string
    recommendations: string
  }
  integrityNote: string
}

export interface CaseCriterion {
  id: string
  label: string
  max: number
  earned: number
  met: boolean
  feedback: string
}

export interface CaseEvaluation {
  score: number
  passed: boolean
  criteria: CaseCriterion[]
  summary: string
}

const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

function keywordHits(text: string, keywords: string[]): number {
  const haystack = normalized(text)
  return keywords.filter((keyword) => haystack.includes(normalized(keyword))).length
}

export const CASE_PASS_SCORE = 70

export function evaluateCase(caseDefinition: CaseDefinition, progress: CaseProgress): CaseEvaluation {
  const criteria: CaseCriterion[] = []

  const conclusionCorrect = progress.conclusionId === caseDefinition.correctConclusionId
  criteria.push({
    id: 'cause',
    label: 'Causa técnica provável',
    max: 25,
    earned: conclusionCorrect ? 25 : 0,
    met: conclusionCorrect,
    feedback: conclusionCorrect
      ? 'A causa escolhida é compatível com o conjunto de evidências.'
      : 'A causa escolhida não explica a seletividade do incidente nem o comportamento das consultas DNS.',
  })

  const unsupportedCorrect = progress.unsupportedClaimId === caseDefinition.unsupportedClaimId
  criteria.push({
    id: 'unsupported',
    label: 'Limite da conclusão',
    max: 5,
    earned: unsupportedCorrect ? 5 : 0,
    met: unsupportedCorrect,
    feedback: unsupportedCorrect
      ? 'Você separou o que os registros mostram daquilo que exigiria outras fontes.'
      : 'Uma das afirmações marcadas como não sustentadas pode ser demonstrada pelos extratos, ou a afirmação sem suporte foi aceita.',
  })

  const expectedEvidence = new Set(caseDefinition.evidenceSelectionCorrectIds)
  const selected = new Set(progress.evidenceSelection)
  const intersection = [...selected].filter((id) => expectedEvidence.has(id)).length
  const union = new Set([...selected, ...expectedEvidence]).size
  const evidenceRatio = union === 0 ? 0 : intersection / union
  const evidenceEarned = Math.round(evidenceRatio * 20)
  criteria.push({
    id: 'evidence',
    label: 'Correlação de evidências',
    max: 20,
    earned: evidenceEarned,
    met: evidenceRatio === 1,
    feedback:
      evidenceRatio === 1
        ? 'As duas fontes selecionadas documentam a mudança de configuração e seu efeito concreto no cliente.'
        : 'A seleção precisa reunir a fonte que mostra a configuração entregue ao cliente e a que mostra o efeito da consulta, sem incluir fontes que apenas contextualizam o caso.',
  })

  const hypothesisHits = caseDefinition.hypotheses.filter(
    (hypothesis) => progress.hypotheses[hypothesis.id] === hypothesis.expected,
  ).length
  const hypothesisEarned = Math.round(
    (hypothesisHits / caseDefinition.hypotheses.length) * 15,
  )
  criteria.push({
    id: 'hypotheses',
    label: 'Teste de hipóteses',
    max: 15,
    earned: hypothesisEarned,
    met: hypothesisHits === caseDefinition.hypotheses.length,
    feedback: `${hypothesisHits} de ${caseDefinition.hypotheses.length} hipóteses classificadas corretamente. Reveja o gabarito e a diferença entre refutar uma hipótese e não dispor de dados para avaliá-la.`,
  })

  const correctPositions = caseDefinition.timeline.filter(
    (event, index) => progress.timeline[index] === event.id,
  ).length
  const timelineEarned = Math.round((correctPositions / caseDefinition.timeline.length) * 15)
  criteria.push({
    id: 'timeline',
    label: 'Linha do tempo',
    max: 15,
    earned: timelineEarned,
    met: correctPositions === caseDefinition.timeline.length,
    feedback: `${correctPositions} de ${caseDefinition.timeline.length} eventos em posição correta. Normalize fusos antes de ordenar decisões e efeitos.`,
  })

  const factsKeywords = ['dns', 'dhcp', '8.8.8.8', 'resolvedor', 'portal', 'nxdomain']
  const inferenceKeywords = ['dns', 'dhcp', 'nome interno', '8.8.8.8', 'configuracao', 'resolvedor externo']
  const limitationsKeywords = ['ausencia', 'nao', 'log', 'fonte', 'atribuicao', 'fuso', 'horario', 'escopo', 'cliente']
  const recommendationKeywords = ['dhcp', 'dns', 'resolver', 'monitor', 'teste', 'mudanca', 'rollback', 'interno']

  const factsText = progress.report.facts.trim()
  const inferenceText = progress.report.inference.trim()
  const limitationsText = progress.report.limitations.trim()
  const recommendationsText = progress.report.recommendations.trim()

  let factsScore = 0
  if (factsText.length >= 200 && keywordHits(factsText, factsKeywords) >= 3) factsScore = 6
  else if (factsText.length >= 100 && keywordHits(factsText, factsKeywords) >= 2) factsScore = 4
  else if (factsText.length >= 60) factsScore = 2

  let inferenceScore = 0
  if (inferenceText.length >= 200 && keywordHits(inferenceText, inferenceKeywords) >= 3) inferenceScore = 6
  else if (inferenceText.length >= 100 && keywordHits(inferenceText, inferenceKeywords) >= 2) inferenceScore = 4
  else if (inferenceText.length >= 60) inferenceScore = 2

  let limitationsScore = 0
  const attributesBlame =
    keywordHits(limitationsText, [
      'ana souza',
      'responsavel individual',
      'culpado',
      'culpada',
      'por culpa',
    ]) > 0
  if (!attributesBlame) {
    if (limitationsText.length >= 150 && keywordHits(limitationsText, limitationsKeywords) >= 3) {
      limitationsScore = 4
    } else if (
      limitationsText.length >= 80 &&
      keywordHits(limitationsText, limitationsKeywords) >= 2
    ) {
      limitationsScore = 2
    }
  }

  let recommendationsScore = 0
  if (
    recommendationsText.length >= 150 &&
    keywordHits(recommendationsText, recommendationKeywords) >= 3
  ) {
    recommendationsScore = 4
  } else if (
    recommendationsText.length >= 80 &&
    keywordHits(recommendationsText, recommendationKeywords) >= 2
  ) {
    recommendationsScore = 2
  }

  const reportEarned = factsScore + inferenceScore + limitationsScore + recommendationsScore
  criteria.push({
    id: 'report',
    label: 'Relatório técnico',
    max: 20,
    earned: reportEarned,
    met: reportEarned >= 16,
    feedback: [
      `Fatos observados: ${factsScore}/6.`,
      `Inferência técnica: ${inferenceScore}/6.`,
      `Limitações: ${limitationsScore}/4.`,
      `Recomendações: ${recommendationsScore}/4.`,
      'A avaliação é por checklist de conteúdo e extensão, não por julgamento semântico automático.',
    ].join(' '),
  })

  const score = criteria.reduce((total, criterion) => total + criterion.earned, 0)
  const passed = score >= CASE_PASS_SCORE
  return {
    score,
    passed,
    criteria,
    summary: passed
      ? 'A análise atinge os critérios mínimos. Confira as justificativas do gabarito e as limitações apontadas.'
      : 'A análise ainda não atinge os critérios mínimos. O gabarito técnico indica quais elos precisam ser revistos.',
  }
}

export interface SubmissionValidation {
  valid: boolean
  missing: string[]
}

export function validateCaseSubmission(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): SubmissionValidation {
  const missing: string[] = []
  if (progress.evidenceOpened.length < 4) {
    missing.push('Examine pelo menos quatro fontes de evidência antes de concluir.')
  }
  if (progress.evidenceSelection.length === 0) {
    missing.push('Selecione as evidências usadas para sustentar a causa imediata.')
  }
  const unclassified = caseDefinition.hypotheses.filter(
    (hypothesis) => !progress.hypotheses[hypothesis.id],
  )
  if (unclassified.length > 0) {
    missing.push(`Classifique todas as hipóteses (${unclassified.length} pendente${unclassified.length > 1 ? 's' : ''}).`)
  }
  if (progress.timeline.length !== caseDefinition.timeline.length) {
    missing.push('Ordene todos os eventos da linha do tempo.')
  }
  if (!progress.conclusionId) missing.push('Escolha a causa técnica provável.')
  if (!progress.unsupportedClaimId) missing.push('Indique qual afirmação não é sustentada pelas evidências.')
  if (!progress.confidence) missing.push('Informe o grau de confiança da conclusão.')
  const fields: Array<[keyof typeof progress.report, string]> = [
    ['facts', 'fatos observados'],
    ['inference', 'inferência técnica'],
    ['limitations', 'limitações'],
    ['recommendations', 'recomendações'],
  ]
  for (const [field, label] of fields) {
    if (progress.report[field].trim().length < 60) {
      missing.push(`Descreva ${label} com pelo menos 60 caracteres.`)
    }
  }
  return { valid: missing.length === 0, missing }
}

export function caseStepStatus(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): Array<{ id: string; label: string; complete: boolean }> {
  return [
    { id: 'evidence', label: 'Evidências', complete: progress.evidenceOpened.length >= 4 },
    {
      id: 'record',
      label: 'Registro',
      complete:
        Object.values(progress.notes).filter((note) => note.trim().length >= 20).length >= 2,
    },
    {
      id: 'analysis',
      label: 'Hipóteses',
      complete:
        caseDefinition.hypotheses.every((hypothesis) => Boolean(progress.hypotheses[hypothesis.id])) &&
        progress.evidenceSelection.length > 0,
    },
    {
      id: 'timeline',
      label: 'Linha do tempo',
      complete: progress.timeline.length === caseDefinition.timeline.length,
    },
    {
      id: 'report',
      label: 'Conclusão',
      complete: Boolean(
        progress.conclusionId &&
          progress.unsupportedClaimId &&
          progress.confidence &&
          progress.report.facts.trim().length >= 60 &&
          progress.report.inference.trim().length >= 60 &&
          progress.report.limitations.trim().length >= 60 &&
          progress.report.recommendations.trim().length >= 60,
      ),
    },
  ]
}
