import { beforeEach, describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  applyExerciseAttempt,
  applyLabCompletion,
  applyLessonCompletion,
  competencyLevel,
  competencyPoints,
  createEmptyCaseProgress,
  createEmptyProgress,
  loadProgress,
  recordCaseSubmission,
  resetCaseProgress,
  sanitizeProgress,
  saveProgress,
  submittedCaseAverage,
  submittedCaseCount,
  updateCaseProgress,
} from './progress'

const at = '2026-09-14T11:00:00.000Z'

describe('registro de progresso', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('conta a primeira aprovação e preserva melhor nota e tentativas', () => {
    const empty = createEmptyProgress()
    const first = applyExerciseAttempt(
      empty,
      {
        exerciseId: 'ex-1',
        lessonId: 'les-1',
        competency: 'redes',
        passed: false,
        score: 0.4,
        hintsUsed: 1,
      },
      at,
    )
    expect(first.firstPass).toBe(false)
    const second = applyExerciseAttempt(
      first.state,
      {
        exerciseId: 'ex-1',
        lessonId: 'les-1',
        competency: 'redes',
        passed: true,
        score: 0.8,
        hintsUsed: 2,
      },
      at,
    )
    expect(second.firstPass).toBe(true)
    expect(second.state.exercises['ex-1']).toMatchObject({
      passed: true,
      attempts: 2,
      bestScore: 0.8,
      hintsUsed: 2,
    })
    const third = applyExerciseAttempt(
      second.state,
      {
        exerciseId: 'ex-1',
        lessonId: 'les-1',
        competency: 'redes',
        passed: true,
        score: 1,
        hintsUsed: 3,
      },
      at,
    )
    expect(third.firstPass).toBe(false)
    expect(third.state.exercises['ex-1'].bestScore).toBe(1)
    expect(third.state.exercises['ex-1'].attempts).toBe(3)
  })

  it('credita lição e laboratório à competência correspondente', () => {
    let state = createEmptyProgress()
    state = applyLessonCompletion(
      state,
      { lessonId: 'les-1', competency: 'diagnostico', score: 100, label: 'Lição 1' },
      at,
    )
    state = applyLabCompletion(
      state,
      { labId: 'lab-redes', competency: 'diagnostico', score: 100, label: 'Laboratório' },
      at,
    )
    expect(competencyPoints(state, 'diagnostico')).toBe(30)
    expect(competencyPoints(state, 'redes')).toBe(0)
    expect(state.activity[0].label).toContain('Laboratório')
    expect(state.activity).toHaveLength(2)
  })

  it('credita submissão de caso apenas ao método pericial', () => {
    let state = createEmptyProgress()
    state = recordCaseSubmission(
      state,
      'portal-fora-do-ar',
      {
        score: 90,
        passed: true,
        at,
        breakdown: [],
      },
      'Caso do portal',
      at,
    )
    expect(submittedCaseCount(state)).toBe(1)
    expect(submittedCaseAverage(state)).toBe(90)
    expect(competencyPoints(state, 'forense')).toBe(27)
    expect(competencyPoints(state, 'redes')).toBe(0)
    expect(competencyPoints(state, 'seguranca')).toBe(0)
    expect(competencyPoints(state, 'cripto')).toBe(0)
    expect(state.cases['portal-fora-do-ar'].actions.at(-1)?.label).toContain('submetido')
  })

  it('mantém rascunho, ações e permite reiniciar apenas o caso', () => {
    let state = updateCaseProgress(
      createEmptyProgress(),
      'portal-fora-do-ar',
      (current) => ({
        ...current,
        evidenceOpened: ['E-01'],
        notes: { 'E-01': 'Lease com DNS externo.' },
      }),
      'Abriu E-01',
      at,
    )
    expect(state.cases['portal-fora-do-ar'].evidenceOpened).toEqual(['E-01'])
    expect(state.cases['portal-fora-do-ar'].actions).toHaveLength(1)
    state = resetCaseProgress(state, 'portal-fora-do-ar')
    expect(state.cases['portal-fora-do-ar']).toBeUndefined()
    expect(state.activity[0].label).toContain('reiniciada')
  })

  it('classifica níveis de competência de forma monotônica', () => {
    expect(competencyLevel(0).id).toBe('nao-iniciado')
    expect(competencyLevel(1).id).toBe('em-desenvolvimento')
    expect(competencyLevel(35).id).toBe('consolidando')
    expect(competencyLevel(65).id).toBe('demonstrado')
    expect(competencyLevel(100).id).toBe('demonstrado')
  })

  it('persiste e recarrega o estado; rejeita estado inválido ou corrompido', () => {
    const state = applyLessonCompletion(
      createEmptyProgress(),
      { lessonId: 'les-1', competency: 'redes', score: 100, label: 'Lição 1' },
      at,
    )
    expect(saveProgress(state)).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    expect(loadProgress()).toEqual(state)

    localStorage.setItem(STORAGE_KEY, '{invalido')
    expect(loadProgress()).toEqual(createEmptyProgress())
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }))
    expect(loadProgress()).toEqual(createEmptyProgress())
    expect(sanitizeProgress(null)).toBeNull()
    expect(sanitizeProgress({ version: 1, exercises: {}, lessons: {}, labs: {}, cases: {}, activity: [] }))
      .not.toBeNull()
  })

  it('mantém a estrutura vazia de caso isolada entre objetos', () => {
    const first = createEmptyCaseProgress()
    const second = createEmptyCaseProgress()
    first.notes['E-01'] = 'nota'
    first.evidenceOpened.push('E-01')
    expect(second.notes).toEqual({})
    expect(second.evidenceOpened).toEqual([])
  })
})
