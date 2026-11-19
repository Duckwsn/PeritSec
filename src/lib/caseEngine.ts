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

export type CaseCriterionId =
  | 'cause'
  | 'unsupported'
  | 'evidence'
  | 'hypotheses'
  | 'timeline'
  | 'custody'
  | 'quesitos'
  | 'report'

export interface CaseCriterionCopy {
  label?: string
  met?: string
  unmet?: string
}

export interface CaseRubric {
  cause: number
  unsupported: number
  evidence: number
  hypotheses: number
  timeline: number
  custody: number
  quesitos: number
  report: number
}

export const DEFAULT_CASE_RUBRIC: CaseRubric = {
  cause: 25,
  unsupported: 5,
  evidence: 20,
  hypotheses: 15,
  timeline: 15,
  custody: 0,
  quesitos: 0,
  report: 20,
}

export type CaseStepSource =
  | 'receipt'
  | 'custody'
  | 'evidence'
  | 'record'
  | 'analysis'
  | 'timeline'
  | 'quesitos'
  | 'report'

export interface CasePhase {
  id: string
  label: string
  description?: string
  source: CaseStepSource
}

export interface CustodyCheckItem {
  id: string
  label: string
  detail: string
  expected: 'documented' | 'missing'
  rationale: string
}

export interface CaseQuesito {
  id: string
  prompt: string
  guidance: string
  minLength: number
  keywords: string[]
  forbidden?: string[]
  referenceAnswer: string
}

export interface CaseCopy {
  conclusionLabel?: string
  conclusionTask?: string
  unsupportedLabel?: string
  evidenceTask?: string
  evidenceSelectionIntro?: string
  evidenceSelectionExplanation?: string
  timelineTitle?: string
  timelineIntro?: string
  timelineNote?: string
  reportTitle?: string
  reportIntro?: string
  reportFieldLabels?: Partial<Record<keyof ReferenceReport, string>>
  rubricNote?: string
  tabLabels?: Partial<
    Record<
      | 'dossie'
      | 'custodia'
      | 'evidencias'
      | 'registro'
      | 'analise'
      | 'linha'
      | 'quesitos'
      | 'relatorio',
      string
    >
  >
}

export interface LegalReference {
  label: string
  description: string
  href: string
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
  timelineInitialOrder?: string[]
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
  rubric?: Partial<CaseRubric>
  criterionCopy?: Partial<Record<CaseCriterionId, CaseCriterionCopy>>
  reportKeywords?: Partial<Record<keyof ReferenceReport, string[]>>
  reportMinLength?: number
  reportLimitationBlocklist?: string[]
  evidenceOpenMin?: number
  notesMin?: number
  custodyChecklist?: CustodyCheckItem[]
  quesitos?: CaseQuesito[]
  phases?: CasePhase[]
  copy?: CaseCopy
  legalReferences?: LegalReference[]
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

const DEFAULT_REPORT_KEYWORDS: Record<keyof ReferenceReport, string[]> = {
  facts: ['dns', 'dhcp', '8.8.8.8', 'resolvedor', 'portal', 'nxdomain'],
  inference: ['dns', 'dhcp', 'nome interno', '8.8.8.8', 'configuracao', 'resolvedor externo'],
  limitations: ['ausencia', 'nao', 'log', 'fonte', 'atribuicao', 'fuso', 'horario', 'escopo', 'cliente'],
  recommendations: ['dhcp', 'dns', 'resolver', 'monitor', 'teste', 'mudanca', 'rollback', 'interno'],
}

const DEFAULT_LIMITATION_BLOCKLIST = [
  'ana souza',
  'responsavel individual',
  'culpado',
  'culpada',
  'por culpa',
]

export function caseRubric(caseDefinition: CaseDefinition): CaseRubric {
  return { ...DEFAULT_CASE_RUBRIC, ...caseDefinition.rubric }
}

export function caseRubricItems(
  caseDefinition: CaseDefinition,
): Array<{ id: CaseCriterionId; label: string; max: number }> {
  const rubric = caseRubric(caseDefinition)
  const copy = caseDefinition.criterionCopy ?? {}
  const items: Array<{ id: CaseCriterionId; label: string; max: number }> = [
    { id: 'cause', label: copy.cause?.label ?? 'Causa técnica provável', max: rubric.cause },
    { id: 'evidence', label: copy.evidence?.label ?? 'Correlação de evidências', max: rubric.evidence },
    { id: 'hypotheses', label: copy.hypotheses?.label ?? 'Teste de hipóteses', max: rubric.hypotheses },
    { id: 'timeline', label: copy.timeline?.label ?? 'Linha do tempo', max: rubric.timeline },
  ]
  if ((caseDefinition.custodyChecklist?.length ?? 0) > 0 && rubric.custody > 0) {
    items.push({
      id: 'custody',
      label: copy.custody?.label ?? 'Custódia e integridade',
      max: rubric.custody,
    })
  }
  if ((caseDefinition.quesitos?.length ?? 0) > 0 && rubric.quesitos > 0) {
    items.push({
      id: 'quesitos',
      label: copy.quesitos?.label ?? 'Quesitos',
      max: rubric.quesitos,
    })
  }
  items.push(
    {
      id: 'unsupported',
      label: copy.unsupported?.label ?? 'Limite da conclusão',
      max: rubric.unsupported,
    },
    { id: 'report', label: copy.report?.label ?? 'Relatório técnico', max: rubric.report },
  )
  return items.filter((item) => item.max > 0)
}

function feedbackFor(
  caseDefinition: CaseDefinition,
  id: CaseCriterionId,
  met: boolean,
  fallback: string,
): string {
  const custom = caseDefinition.criterionCopy?.[id]
  return (met ? custom?.met : custom?.unmet) ?? fallback
}

export function evaluateCase(caseDefinition: CaseDefinition, progress: CaseProgress): CaseEvaluation {
  const rubric = caseRubric(caseDefinition)
  const criteria: CaseCriterion[] = []

  const conclusionCorrect = progress.conclusionId === caseDefinition.correctConclusionId
  criteria.push({
    id: 'cause',
    label: caseDefinition.criterionCopy?.cause?.label ?? 'Causa técnica provável',
    max: rubric.cause,
    earned: conclusionCorrect ? rubric.cause : 0,
    met: conclusionCorrect,
    feedback: feedbackFor(
      caseDefinition,
      'cause',
      conclusionCorrect,
      conclusionCorrect
        ? 'A causa escolhida é compatível com o conjunto de evidências.'
        : 'A causa escolhida não explica a seletividade do incidente nem o comportamento das consultas DNS.',
    ),
  })

  const expectedEvidence = new Set(caseDefinition.evidenceSelectionCorrectIds)
  const selected = new Set(progress.evidenceSelection)
  const intersection = [...selected].filter((id) => expectedEvidence.has(id)).length
  const union = new Set([...selected, ...expectedEvidence]).size
  const evidenceRatio = union === 0 ? 0 : intersection / union
  const evidenceEarned = Math.round(evidenceRatio * rubric.evidence)
  criteria.push({
    id: 'evidence',
    label: caseDefinition.criterionCopy?.evidence?.label ?? 'Correlação de evidências',
    max: rubric.evidence,
    earned: evidenceEarned,
    met: evidenceRatio === 1,
    feedback: feedbackFor(
      caseDefinition,
      'evidence',
      evidenceRatio === 1,
      evidenceRatio === 1
        ? 'As fontes selecionadas documentam diretamente o que a conclusão exige, sem itens que apenas contextualizam.'
        : 'A seleção precisa reunir as fontes que sustentam diretamente a conclusão e excluir as que apenas contextualizam o caso.',
    ),
  })

  const hypothesisHits = caseDefinition.hypotheses.filter(
    (hypothesis) => progress.hypotheses[hypothesis.id] === hypothesis.expected,
  ).length
  const hypothesisEarned = Math.round(
    (hypothesisHits / caseDefinition.hypotheses.length) * rubric.hypotheses,
  )
  criteria.push({
    id: 'hypotheses',
    label: caseDefinition.criterionCopy?.hypotheses?.label ?? 'Teste de hipóteses',
    max: rubric.hypotheses,
    earned: hypothesisEarned,
    met: hypothesisHits === caseDefinition.hypotheses.length,
    feedback: feedbackFor(
      caseDefinition,
      'hypotheses',
      hypothesisHits === caseDefinition.hypotheses.length,
      `${hypothesisHits} de ${caseDefinition.hypotheses.length} hipóteses classificadas corretamente. Reveja o gabarito e a diferença entre refutar uma hipótese e não dispor de dados para avaliá-la.`,
    ),
  })

  const correctPositions = caseDefinition.timeline.filter(
    (event, index) => progress.timeline[index] === event.id,
  ).length
  const timelineEarned = Math.round((correctPositions / caseDefinition.timeline.length) * rubric.timeline)
  criteria.push({
    id: 'timeline',
    label: caseDefinition.criterionCopy?.timeline?.label ?? 'Linha do tempo',
    max: rubric.timeline,
    earned: timelineEarned,
    met: correctPositions === caseDefinition.timeline.length,
    feedback: feedbackFor(
      caseDefinition,
      'timeline',
      correctPositions === caseDefinition.timeline.length,
      `${correctPositions} de ${caseDefinition.timeline.length} eventos em posição correta. Normalize fusos antes de ordenar decisões e efeitos.`,
    ),
  })

  const custodyItems = caseDefinition.custodyChecklist ?? []
  if (custodyItems.length > 0 && rubric.custody > 0) {
    const custodyCorrect = custodyItems.filter(
      (item) => progress.custodyChecks[item.id] === item.expected,
    ).length
    const custodyEarned = Math.round((custodyCorrect / custodyItems.length) * rubric.custody)
    criteria.push({
      id: 'custody',
      label: caseDefinition.criterionCopy?.custody?.label ?? 'Custódia e integridade',
      max: rubric.custody,
      earned: custodyEarned,
      met: custodyCorrect === custodyItems.length,
      feedback: feedbackFor(
        caseDefinition,
        'custody',
        custodyCorrect === custodyItems.length,
        `${custodyCorrect} de ${custodyItems.length} itens de custódia avaliados corretamente. Compare o que está documentado com o que apenas se presume.`,
      ),
    })
  }

  const quesitos = caseDefinition.quesitos ?? []
  if (quesitos.length > 0 && rubric.quesitos > 0) {
    const ratios = quesitos.map((quesito) =>
      evaluateQuesito(quesito, progress.quesitos[quesito.id] ?? ''),
    )
    const fullAnswers = ratios.filter((ratio) => ratio === 1).length
    const quesitosEarned = Math.round(
      (ratios.reduce((total, ratio) => total + ratio, 0) / quesitos.length) * rubric.quesitos,
    )
    criteria.push({
      id: 'quesitos',
      label: caseDefinition.criterionCopy?.quesitos?.label ?? 'Quesitos',
      max: rubric.quesitos,
      earned: quesitosEarned,
      met: fullAnswers === quesitos.length,
      feedback: feedbackFor(
        caseDefinition,
        'quesitos',
        fullAnswers === quesitos.length,
        `${fullAnswers} de ${quesitos.length} quesitos com resposta completa. A correção verifica extensão e presença de elementos técnicos, não julgamento semântico automático.`,
      ),
    })
  }

  const unsupportedCorrect = progress.unsupportedClaimId === caseDefinition.unsupportedClaimId
  criteria.push({
    id: 'unsupported',
    label: caseDefinition.criterionCopy?.unsupported?.label ?? 'Limite da conclusão',
    max: rubric.unsupported,
    earned: unsupportedCorrect ? rubric.unsupported : 0,
    met: unsupportedCorrect,
    feedback: feedbackFor(
      caseDefinition,
      'unsupported',
      unsupportedCorrect,
      unsupportedCorrect
        ? 'Você separou o que os registros mostram daquilo que exigiria outras fontes.'
        : 'Uma das afirmações marcadas como não sustentadas pode ser demonstrada pelos extratos, ou a afirmação sem suporte foi aceita.',
    ),
  })

  const keywords: Record<keyof ReferenceReport, string[]> = {
    ...DEFAULT_REPORT_KEYWORDS,
    ...caseDefinition.reportKeywords,
  }
  const minLength = caseDefinition.reportMinLength ?? 60
  const factsText = progress.report.facts.trim()
  const inferenceText = progress.report.inference.trim()
  const limitationsText = progress.report.limitations.trim()
  const recommendationsText = progress.report.recommendations.trim()

  const longSection = (text: string, words: string[]) => {
    const full = Math.round(rubric.report * 0.3)
    const partial = Math.round(rubric.report * 0.2)
    const minimal = Math.round(rubric.report * 0.1)
    if (text.length >= 200 && keywordHits(text, words) >= 3) return full
    if (text.length >= 100 && keywordHits(text, words) >= 2) return partial
    if (text.length >= minLength) return minimal
    return 0
  }

  const shortSection = (text: string, words: string[]) => {
    const full = Math.round(rubric.report * 0.2)
    const partial = Math.round(rubric.report * 0.1)
    if (text.length >= 150 && keywordHits(text, words) >= 3) return full
    if (text.length >= 80 && keywordHits(text, words) >= 2) return partial
    return 0
  }

  const attributesBlame = keywordHits(
    limitationsText,
    caseDefinition.reportLimitationBlocklist ?? DEFAULT_LIMITATION_BLOCKLIST,
  ) > 0
  const factsScore = longSection(factsText, keywords.facts)
  const inferenceScore = longSection(inferenceText, keywords.inference)
  const limitationsScore = attributesBlame ? 0 : shortSection(limitationsText, keywords.limitations)
  const recommendationsScore = shortSection(recommendationsText, keywords.recommendations)

  const reportEarned = factsScore + inferenceScore + limitationsScore + recommendationsScore
  criteria.push({
    id: 'report',
    label: caseDefinition.criterionCopy?.report?.label ?? 'Relatório técnico',
    max: rubric.report,
    earned: reportEarned,
    met: reportEarned >= Math.round(rubric.report * 0.8),
    feedback: feedbackFor(
      caseDefinition,
      'report',
      reportEarned >= Math.round(rubric.report * 0.8),
      [
        `Fatos observados: ${factsScore}/${Math.round(rubric.report * 0.3)}.`,
        `Inferência técnica: ${inferenceScore}/${Math.round(rubric.report * 0.3)}.`,
        `Limitações: ${limitationsScore}/${Math.round(rubric.report * 0.2)}.`,
        `Recomendações: ${recommendationsScore}/${Math.round(rubric.report * 0.2)}.`,
        'A avaliação é por checklist de conteúdo e extensão, não por julgamento semântico automático.',
      ].join(' '),
    ),
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

function evaluateQuesito(quesito: CaseQuesito, answer: string): number {
  const text = answer.trim()
  if (text.length < quesito.minLength) return 0
  const haystack = normalized(text)
  if (quesito.forbidden?.some((term) => haystack.includes(normalized(term)))) return 0
  const hits = keywordHits(text, quesito.keywords)
  if (hits >= 2) return 1
  if (hits === 1) return 0.5
  return 0
}

export interface SubmissionValidation {
  valid: boolean
  missing: string[]
}

const numberWords: Record<number, string> = {
  1: 'uma',
  2: 'duas',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
}

function countLabel(value: number): string {
  return numberWords[value] ?? String(value)
}

export function validateCaseSubmission(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): SubmissionValidation {
  const missing: string[] = []
  const minLength = caseDefinition.reportMinLength ?? 60
  const evidenceOpenMin = caseDefinition.evidenceOpenMin ?? 4
  if (progress.evidenceOpened.length < evidenceOpenMin) {
    missing.push(
      `Examine pelo menos ${countLabel(evidenceOpenMin)} fontes de evidência antes de concluir.`,
    )
  }
  if (progress.evidenceSelection.length === 0) {
    missing.push('Selecione as evidências usadas para sustentar a conclusão.')
  }
  const unclassified = caseDefinition.hypotheses.filter(
    (hypothesis) => !progress.hypotheses[hypothesis.id],
  )
  if (unclassified.length > 0) {
    missing.push(
      `Classifique todas as hipóteses (${unclassified.length} pendente${unclassified.length > 1 ? 's' : ''}).`,
    )
  }
  if (progress.timeline.length !== caseDefinition.timeline.length) {
    missing.push('Ordene todos os eventos da linha do tempo.')
  }
  const notesMin = caseDefinition.notesMin ?? 2
  const writtenNotes = Object.values(progress.notes).filter(
    (note) => note.trim().length >= 20,
  ).length
  if (writtenNotes < notesMin) {
    missing.push(`Registre observações em pelo menos ${notesMin} fontes (${writtenNotes} registrada${writtenNotes === 1 ? '' : 's'}).`)
  }
  const custodyItems = caseDefinition.custodyChecklist ?? []
  if (custodyItems.length > 0) {
    const unanswered = custodyItems.filter((item) => !progress.custodyChecks[item.id]).length
    if (unanswered > 0) {
      missing.push(
        `Classifique todos os itens de custódia (${unanswered} pendente${unanswered > 1 ? 's' : ''}).`,
      )
    }
  }
  const quesitos = caseDefinition.quesitos ?? []
  if (quesitos.length > 0) {
    const pending = quesitos.filter(
      (quesito) => (progress.quesitos[quesito.id] ?? '').trim().length < quesito.minLength,
    ).length
    if (pending > 0) {
      missing.push(
        `Responda todos os quesitos com extensão mínima (${pending} pendente${pending > 1 ? 's' : ''}).`,
      )
    }
  }
  if (!progress.conclusionId) {
    const label = (caseDefinition.copy?.conclusionLabel ?? 'causa técnica provável').toLowerCase()
    missing.push(`Escolha a ${label}.`)
  }
  if (!progress.unsupportedClaimId) {
    missing.push('Indique qual afirmação não é sustentada pelas evidências.')
  }
  if (!progress.confidence) missing.push('Informe o grau de confiança da conclusão.')
  const fields: Array<[keyof typeof progress.report, string]> = [
    ['facts', 'fatos observados'],
    ['inference', 'inferência técnica'],
    ['limitations', 'limitações'],
    ['recommendations', 'recomendações'],
  ]
  for (const [field, label] of fields) {
    if (progress.report[field].trim().length < minLength) {
      missing.push(`Descreva ${label} com pelo menos ${minLength} caracteres.`)
    }
  }
  return { valid: missing.length === 0, missing }
}

export interface CaseStepStatus {
  id: string
  label: string
  complete: boolean
}

function internalStepStatuses(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): CaseStepStatus[] {
  const minLength = caseDefinition.reportMinLength ?? 60
  const custodyItems = caseDefinition.custodyChecklist ?? []
  const quesitos = caseDefinition.quesitos ?? []
  return [
    { id: 'receipt', label: 'Recebimento', complete: progress.evidenceOpened.length > 0 },
    {
      id: 'custody',
      label: 'Custódia',
      complete:
        custodyItems.length === 0 ||
        custodyItems.every((item) => Boolean(progress.custodyChecks[item.id])),
    },
    {
      id: 'evidence',
      label: 'Evidências',
      complete: progress.evidenceOpened.length >= (caseDefinition.evidenceOpenMin ?? 4),
    },
    {
      id: 'record',
      label: 'Registro',
      complete:
        Object.values(progress.notes).filter((note) => note.trim().length >= 20).length >=
        (caseDefinition.notesMin ?? 2),
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
      id: 'quesitos',
      label: 'Quesitos',
      complete:
        quesitos.length === 0 ||
        quesitos.every(
          (quesito) =>
            (progress.quesitos[quesito.id] ?? '').trim().length >= quesito.minLength,
        ),
    },
    {
      id: 'report',
      label: 'Conclusão',
      complete: Boolean(
        progress.conclusionId &&
          progress.unsupportedClaimId &&
          progress.confidence &&
          progress.report.facts.trim().length >= minLength &&
          progress.report.inference.trim().length >= minLength &&
          progress.report.limitations.trim().length >= minLength &&
          progress.report.recommendations.trim().length >= minLength,
      ),
    },
  ]
}

export function caseStepStatus(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): CaseStepStatus[] {
  const statuses = internalStepStatuses(caseDefinition, progress)
  return statuses.filter((status) => {
    if (status.id === 'receipt') return false
    if (status.id === 'custody') return (caseDefinition.custodyChecklist?.length ?? 0) > 0
    if (status.id === 'quesitos') return (caseDefinition.quesitos?.length ?? 0) > 0
    return true
  })
}

export function casePhaseStatus(
  caseDefinition: CaseDefinition,
  progress: CaseProgress,
): CaseStepStatus[] {
  if (!caseDefinition.phases?.length) return caseStepStatus(caseDefinition, progress)
  const statuses = internalStepStatuses(caseDefinition, progress)
  return caseDefinition.phases.map((phase) => ({
    id: phase.id,
    label: phase.label,
    complete: statuses.find((status) => status.id === phase.source)?.complete ?? false,
  }))
}
