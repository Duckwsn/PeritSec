import { describe, expect, it } from 'vitest'
import { sha256Hex } from './crypto'
import {
  CASE_PASS_SCORE,
  caseStepStatus,
  evaluateCase,
  validateCaseSubmission,
  type CaseDefinition,
} from './caseEngine'
import { investigationCases, getCaseById } from '../data/cases'
import { createEmptyCaseProgress, type CaseProgress } from './progress'

function portalCase(): CaseDefinition {
  const definition = getCaseById('portal-fora-do-ar')
  if (!definition) throw new Error('Caso completo ausente.')
  return definition
}

function completeProgress(definition: CaseDefinition): CaseProgress {
  const empty = createEmptyCaseProgress()
  return {
    ...empty,
    evidenceOpened: definition.evidence.map((item) => item.id),
    evidenceSelection: [...definition.evidenceSelectionCorrectIds],
    notes: {
      'E-01': 'Registro DHCP com resolvedor 8.8.8.8 entregue ao host 10.30.4.23 às 08:04.',
      'E-05': 'Captura mostra consultas ao resolvedor externo e respostas NXDOMAIN no intervalo.',
    },
    timeline: definition.timeline.map((event) => event.id),
    hypotheses: Object.fromEntries(
      definition.hypotheses.map((hypothesis) => [hypothesis.id, hypothesis.expected]),
    ),
    conclusionId: definition.correctConclusionId,
    confidence: 'alta',
    unsupportedClaimId: definition.unsupportedClaimId,
    report: { ...definition.referenceReport },
  }
}

describe('caso Portal fora do ar', () => {
  it('mantém o catálogo fictício e a integridade SHA-256 das cópias', () => {
    expect(investigationCases.length).toBeGreaterThan(0)
    const definition = portalCase()
    expect(definition.evidence).toHaveLength(8)
    expect(definition.evidenceSelectionCorrectIds).toEqual(['E-01', 'E-05'])
    for (const item of definition.evidence) {
      expect(item.hash).toMatch(/^[a-f0-9]{64}$/)
      expect(sha256Hex(item.content)).toBe(item.hash)
    }
    expect(definition.hypotheses.find((hypothesis) => hypothesis.id === 'H-04')?.expected).toBe(
      'insufficient',
    )
    expect(definition.unsupportedClaimId).toBe('U-01')
    expect(definition.timeline.map((event) => event.id)).toEqual([
      'T-01',
      'T-02',
      'T-03',
      'T-04',
      'T-05',
      'T-06',
    ])
  })

  it('atribui zero a uma submissão vazia e aponta pendências', () => {
    const definition = portalCase()
    const empty = createEmptyCaseProgress()
    const evaluation = evaluateCase(definition, empty)
    expect(evaluation.score).toBe(0)
    expect(evaluation.passed).toBe(false)
    expect(evaluation.score).toBeLessThan(CASE_PASS_SCORE)
    const validation = validateCaseSubmission(definition, empty)
    expect(validation.valid).toBe(false)
    expect(validation.missing.length).toBeGreaterThanOrEqual(6)
    expect(validation.missing.join(' ')).toContain('quatro fontes')
  })

  it('atinge 100/100 com causa, evidências, hipóteses, linha do tempo e laudo completos', () => {
    const definition = portalCase()
    const progress = completeProgress(definition)
    const evaluation = evaluateCase(definition, progress)
    expect(evaluation.criteria.map((criterion) => criterion.max).reduce((a, b) => a + b, 0)).toBe(
      100,
    )
    expect(evaluation.score).toBe(100)
    expect(evaluation.passed).toBe(true)
    expect(evaluation.criteria.every((criterion) => criterion.met)).toBe(true)
    expect(validateCaseSubmission(definition, progress)).toEqual({ valid: true, missing: [] })
    expect(caseStepStatus(definition, progress).every((step) => step.complete)).toBe(true)
  })

  it('penaliza evidência contextual fora do par direto e conclusão errada', () => {
    const definition = portalCase()
    const progress = completeProgress(definition)
    const withExtra = {
      ...progress,
      evidenceSelection: ['E-01', 'E-05', 'E-02'],
      conclusionId: 'C-03',
      hypotheses: { ...progress.hypotheses, 'H-02': 'insufficient' as const },
    }
    const evaluation = evaluateCase(definition, withExtra)
    expect(evaluation.score).toBeLessThan(100)
    expect(evaluation.score).toBeGreaterThanOrEqual(0)
    expect(evaluation.criteria.find((criterion) => criterion.id === 'cause')?.earned).toBe(0)
    expect(evaluation.criteria.find((criterion) => criterion.id === 'evidence')?.earned).toBe(13)
    expect(evaluation.criteria.find((criterion) => criterion.id === 'hypotheses')?.earned).toBe(12)
    expect(evaluation.criteria.find((criterion) => criterion.id === 'unsupported')?.earned).toBe(5)
  })

  it('não considera um laudo curto ou com atribuição individual como completo', () => {
    const definition = portalCase()
    const progress = completeProgress(definition)
    const invalid = {
      ...progress,
      report: {
        facts: 'Curto demais.',
        inference: progress.report.inference,
        limitations: `${progress.report.limitations} Ana Souza foi a responsável.`,
        recommendations: progress.report.recommendations,
      },
    }
    const validation = validateCaseSubmission(definition, invalid)
    expect(validation.valid).toBe(false)
    const evaluation = evaluateCase(definition, invalid)
    expect(evaluation.criteria.find((criterion) => criterion.id === 'report')?.earned).toBeLessThan(
      20,
    )
  })

  it('só marca as etapas como completas quando os requisitos reais são cumpridos', () => {
    const definition = portalCase()
    const partial = createEmptyCaseProgress()
    partial.evidenceOpened = ['E-01', 'E-02']
    partial.hypotheses = { 'H-01': 'refuted' }
    const steps = caseStepStatus(definition, partial)
    expect(steps.find((step) => step.id === 'evidence')?.complete).toBe(false)
    expect(steps.find((step) => step.id === 'analysis')?.complete).toBe(false)
    expect(steps.find((step) => step.id === 'timeline')?.complete).toBe(false)
    expect(steps.find((step) => step.id === 'report')?.complete).toBe(false)
  })
})
