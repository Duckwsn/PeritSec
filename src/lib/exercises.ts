import { generateSubnetChallenge, isIpv4 } from './subnet'

export type Difficulty = 'iniciante' | 'intermediario' | 'avancado'

interface ExerciseBase {
  id: string
  objective: string
  difficulty: Difficulty
  prompt: string
  context?: string
  hints: string[]
  explanation: string
  prerequisites?: string[]
}

export interface McqExercise extends ExerciseBase {
  kind: 'mcq'
  choices: Array<{ id: string; label: string; rationale: string }>
  answerId: string
}

export interface ShortExercise extends ExerciseBase {
  kind: 'short'
  accepted: string[]
  placeholder?: string
  sampleAnswer: string
}

export interface SubnetExercise extends ExerciseBase {
  kind: 'subnet'
  seed: number
}

export interface OrderExercise extends ExerciseBase {
  kind: 'order'
  items: Array<{ id: string; label: string }>
  correctOrder: string[]
}

export interface MultiExercise extends ExerciseBase {
  kind: 'multi'
  choices: Array<{ id: string; label: string; rationale: string }>
  correctIds: string[]
  submitLabel?: string
}

export type Exercise =
  | McqExercise
  | ShortExercise
  | SubnetExercise
  | OrderExercise
  | MultiExercise

export interface SubnetResponseValues {
  network: string
  broadcast: string
  firstUsable: string
  lastUsable: string
  usableHosts: string
}

export type ExerciseResponse =
  | { kind: 'mcq'; choiceId: string }
  | { kind: 'short'; value: string }
  | { kind: 'subnet'; values: SubnetResponseValues; seed: number }
  | { kind: 'order'; order: string[] }
  | { kind: 'multi'; ids: string[] }

export interface ResultDetail {
  label: string
  correct: boolean
  expected?: string
  actual?: string
}

export interface ExerciseResult {
  passed: boolean
  score: number
  summary: string
  details: ResultDetail[]
}

export function normalizeShortAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,;:!?'"`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizedIp(value: string): string {
  const candidate = value.trim().split('/')[0]
  return isIpv4(candidate) ? candidate : value.trim()
}

export function isResponseComplete(exercise: Exercise, response: ExerciseResponse | null): boolean {
  if (!response) return false
  switch (exercise.kind) {
    case 'mcq':
      return response.kind === 'mcq' && Boolean(response.choiceId)
    case 'short':
      return response.kind === 'short' && response.value.trim().length > 0
    case 'subnet':
      if (response.kind !== 'subnet') return false
      return Object.values(response.values).every((value) => value.trim().length > 0)
    case 'order':
      return (
        response.kind === 'order' &&
        response.order.length === exercise.correctOrder.length &&
        new Set(response.order).size === response.order.length
      )
    case 'multi':
      return response.kind === 'multi' && response.ids.length > 0
  }
}

export function gradeExercise(exercise: Exercise, response: ExerciseResponse): ExerciseResult {
  switch (exercise.kind) {
    case 'mcq': {
      if (response.kind !== 'mcq') throw new Error('Resposta incompatível com exercício de múltipla escolha.')
      const correct = response.choiceId === exercise.answerId
      return {
        passed: correct,
        score: correct ? 1 : 0,
        summary: correct
          ? 'Resposta correta.'
          : 'A alternativa escolhida não explica o cenário. Reveja as justificativas.',
        details: [],
      }
    }
    case 'short': {
      if (response.kind !== 'short') throw new Error('Resposta incompatível com exercício aberto.')
      const normalized = normalizeShortAnswer(response.value)
      const correct = exercise.accepted.some((answer) => normalizeShortAnswer(answer) === normalized)
      return {
        passed: correct,
        score: correct ? 1 : 0,
        summary: correct
          ? 'Resposta aceita.'
          : 'A formulação não corresponde ao que o cenário pede. Compare com a resposta de referência e tente novamente.',
        details: [],
      }
    }
    case 'subnet': {
      if (response.kind !== 'subnet') throw new Error('Resposta incompatível com exercício de sub-rede.')
      const challenge = generateSubnetChallenge(response.seed)
      const fields: Array<[string, keyof SubnetResponseValues, string, boolean]> = [
        ['Endereço de rede', 'network', challenge.network, true],
        ['Endereço de broadcast', 'broadcast', challenge.broadcast, true],
        ['Primeiro host utilizável', 'firstUsable', challenge.firstUsable, true],
        ['Último host utilizável', 'lastUsable', challenge.lastUsable, true],
        ['Hosts utilizáveis', 'usableHosts', String(challenge.usableHosts), false],
      ]
      const details = fields.map(([label, key, expected, isIp]) => {
        const raw = response.values[key].trim()
        const actual = isIp ? normalizedIp(raw) : raw.replace(/\D/g, '')
        return { label, correct: actual === expected, expected, actual: raw || '—' }
      })
      const correctCount = details.filter((detail) => detail.correct).length
      const passed = correctCount === details.length
      return {
        passed,
        score: correctCount / details.length,
        summary: passed
          ? 'Cálculo de sub-rede correto.'
          : `${correctCount} de ${details.length} campos corretos. Confira a conversão entre prefixo, máscara e faixa de hosts.`,
        details,
      }
    }
    case 'order': {
      if (response.kind !== 'order') throw new Error('Resposta incompatível com exercício de ordenação.')
      const details = exercise.correctOrder.map((id, index) => {
        const item = exercise.items.find((candidate) => candidate.id === id)
        return {
          label: `Posição ${index + 1}`,
          correct: response.order[index] === id,
          expected: item?.label,
          actual:
            exercise.items.find((candidate) => candidate.id === response.order[index])?.label ?? '—',
        }
      })
      const correctCount = details.filter((detail) => detail.correct).length
      const passed = correctCount === details.length
      return {
        passed,
        score: correctCount / details.length,
        summary: passed
          ? 'Sequência correta.'
          : `${correctCount} de ${details.length} posições corretas.`,
        details,
      }
    }
    case 'multi': {
      if (response.kind !== 'multi') throw new Error('Resposta incompatível com exercício de seleção.')
      const selected = new Set(response.ids)
      const expected = new Set(exercise.correctIds)
      const details = exercise.choices.map((choice) => {
        const shouldSelect = expected.has(choice.id)
        const selectedChoice = selected.has(choice.id)
        return {
          label: choice.label,
          correct: shouldSelect === selectedChoice,
          expected: shouldSelect ? 'Selecionar' : 'Não selecionar',
          actual: selectedChoice ? 'Selecionado' : 'Não selecionado',
        }
      })
      const correctCount = details.filter((detail) => detail.correct).length
      const passed = correctCount === details.length
      return {
        passed,
        score: correctCount / details.length,
        summary: passed
          ? 'Seleção correta.'
          : 'A seleção inclui itens indevidos ou deixa de fora elementos necessários.',
        details,
      }
    }
  }
}

/** Gera uma semente nova para "outra variação" sem alterar o motor determinístico. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}
