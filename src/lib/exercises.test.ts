import { describe, expect, it } from 'vitest'
import {
  gradeExercise,
  isResponseComplete,
  normalizeShortAnswer,
  type Exercise,
  type ExerciseResponse,
} from './exercises'
import { generateSubnetChallenge } from './subnet'

const base = {
  id: 'teste',
  objective: 'Objetivo de teste.',
  difficulty: 'iniciante' as const,
  prompt: 'Pergunta de teste.',
  hints: ['Pista.'],
  explanation: 'Explicação.',
}

describe('normalização e completude', () => {
  it('ignora caixa, acentos, pontuação e espaços redundantes', () => {
    expect(normalizeShortAnswer('  NXDOMAIN!  ')).toBe('nxdomain')
    expect(normalizeShortAnswer('Não   há rota.')).toBe('nao ha rota')
    expect(normalizeShortAnswer('Ação, rede; teste?')).toBe('acao rede teste')
  })

  it('detecta respostas incompletas antes da correção', () => {
    const mcq: Exercise = {
      ...base,
      kind: 'mcq',
      choices: [
        { id: 'a', label: 'A', rationale: '' },
        { id: 'b', label: 'B', rationale: '' },
      ],
      answerId: 'a',
    }
    expect(isResponseComplete(mcq, null)).toBe(false)
    expect(isResponseComplete(mcq, { kind: 'mcq', choiceId: '' })).toBe(false)
    expect(isResponseComplete(mcq, { kind: 'mcq', choiceId: 'a' })).toBe(true)
    expect(isResponseComplete(mcq, { kind: 'short', value: 'a' })).toBe(false)
  })
})

describe('correção de exercícios', () => {
  it('corrige múltipla escolha com justificativa registrada', () => {
    const exercise: Exercise = {
      ...base,
      kind: 'mcq',
      choices: [
        { id: 'a', label: 'Resolver externo', rationale: 'Não conhece a zona interna.' },
        { id: 'b', label: 'Resolver interno', rationale: 'Conhece a zona interna.' },
      ],
      answerId: 'b',
    }
    expect(gradeExercise(exercise, { kind: 'mcq', choiceId: 'b' })).toMatchObject({
      passed: true,
      score: 1,
    })
    expect(gradeExercise(exercise, { kind: 'mcq', choiceId: 'a' })).toMatchObject({
      passed: false,
      score: 0,
    })
  })

  it('aceita resposta curta equivalente e rejeita incompatível', () => {
    const exercise: Exercise = {
      ...base,
      kind: 'short',
      accepted: ['NXDOMAIN', 'domínio inexistente'],
      sampleAnswer: 'NXDOMAIN',
    }
    expect(gradeExercise(exercise, { kind: 'short', value: ' nxdomain ' }).passed).toBe(true)
    expect(gradeExercise(exercise, { kind: 'short', value: 'Domínio inexistente.' }).passed).toBe(
      true,
    )
    expect(gradeExercise(exercise, { kind: 'short', value: 'SERVFAIL' }).passed).toBe(false)
  })

  it('corrige todos os campos de sub-rede e aponta erros', () => {
    const challenge = generateSubnetChallenge(42)
    const exercise: Exercise = { ...base, kind: 'subnet', seed: 42 }
    const correct: ExerciseResponse = {
      kind: 'subnet',
      seed: 42,
      values: {
        network: challenge.network,
        broadcast: challenge.broadcast,
        firstUsable: challenge.firstUsable,
        lastUsable: challenge.lastUsable,
        usableHosts: String(challenge.usableHosts),
      },
    }
    const result = gradeExercise(exercise, correct)
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details).toHaveLength(5)

    const wrong = gradeExercise(exercise, {
      ...correct,
      values: { ...correct.values, broadcast: '203.0.113.255' },
    })
    expect(wrong.passed).toBe(false)
    expect(wrong.details.find((detail) => detail.label === 'Endereço de broadcast')?.correct).toBe(
      false,
    )
  })

  it('pontua ordenação por posição e seleção por conjunto exato', () => {
    const order: Exercise = {
      ...base,
      kind: 'order',
      items: [
        { id: '1', label: 'Identificar' },
        { id: '2', label: 'Coletar' },
        { id: '3', label: 'Analisar' },
      ],
      correctOrder: ['1', '2', '3'],
    }
    const partial = gradeExercise(order, { kind: 'order', order: ['1', '3', '2'] })
    expect(partial.passed).toBe(false)
    expect(partial.score).toBeCloseTo(1 / 3)

    const multi: Exercise = {
      ...base,
      kind: 'multi',
      choices: [
        { id: 'a', label: 'Log', rationale: '' },
        { id: 'b', label: 'Hash', rationale: '' },
        { id: 'c', label: 'Boato', rationale: '' },
      ],
      correctIds: ['a', 'b'],
    }
    expect(gradeExercise(multi, { kind: 'multi', ids: ['a', 'b'] }).passed).toBe(true)
    expect(gradeExercise(multi, { kind: 'multi', ids: ['a'] }).passed).toBe(false)
    expect(gradeExercise(multi, { kind: 'multi', ids: ['a', 'b', 'c'] }).passed).toBe(false)
  })
})
