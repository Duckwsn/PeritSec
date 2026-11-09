import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Lightbulb, RefreshCw } from 'lucide-react'
import {
  gradeExercise,
  isResponseComplete,
  newSeed,
  type Exercise,
  type ExerciseResponse,
  type ExerciseResult,
  type ResultDetail,
  type SubnetExercise,
} from '../lib/exercises'
import { generateSubnetChallenge } from '../lib/subnet'
import type { CompetencyId } from '../lib/progress'
import { useProgress } from '../context/ProgressContext'
import { ProgressBar, Tag } from './ui'

const KIND_LABEL: Record<Exercise['kind'], string> = {
  mcq: 'Múltipla escolha',
  short: 'Resposta curta',
  subnet: 'Cálculo de sub-rede',
  order: 'Ordenação',
  multi: 'Seleção múltipla',
}

const DIFFICULTY_LABEL: Record<Exercise['difficulty'], string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

function shuffleDeterministic<T extends { id: string }>(items: T[], seedSource: string): T[] {
  let seed = 2166136261
  for (const character of seedSource) {
    seed ^= character.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }
  const shuffled = [...items]
  let state = seed >>> 0
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const swapIndex = state % (index + 1)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function initialResponse(exercise: Exercise): ExerciseResponse | null {
  if (exercise.kind === 'order') {
    const shuffled = shuffleDeterministic(exercise.items, exercise.id)
    let order = shuffled.map((item) => item.id)
    if (order.every((id, index) => id === exercise.correctOrder[index])) {
      order = [...order.slice(1), order[0]]
    }
    return { kind: 'order', order }
  }
  return null
}

function ResultDetails({ details }: { details: ResultDetail[] }) {
  if (details.length === 0) return null
  return (
    <ul className="result-details">
      {details.map((detail, index) => (
        <li key={`${detail.label}-${index}`} className={detail.correct ? 'is-correct' : 'is-wrong'}>
          <span className="result-details__mark" aria-hidden="true" />
          <span>
            <strong>{detail.label}:</strong> {detail.correct ? 'correto' : 'incorreto'}
            {!detail.correct && detail.expected && (
              <>
                {' '}
                — esperado <code>{detail.expected}</code>, recebido <code>{detail.actual ?? '—'}</code>.
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ExercisePlayer({
  lessonId,
  lessonTitle,
  competency,
  exercises,
  onComplete,
}: {
  lessonId: string
  lessonTitle: string
  competency: CompetencyId
  exercises: Exercise[]
  onComplete?: () => void
}) {
  const { progress, recordExercise, completeLesson } = useProgress()
  const [responses, setResponses] = useState<Record<string, ExerciseResponse | null>>(() =>
    Object.fromEntries(exercises.map((exercise) => [exercise.id, initialResponse(exercise)])),
  )
  const [results, setResults] = useState<Record<string, ExerciseResult>>({})
  const [hintsShown, setHintsShown] = useState<Record<string, number>>({})
  const [seeds, setSeeds] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      exercises
        .filter((exercise): exercise is SubnetExercise => exercise.kind === 'subnet')
        .map((exercise) => [exercise.id, exercise.seed]),
    ),
  )
  const [localPassed, setLocalPassed] = useState<Set<string>>(
    () =>
      new Set(
        exercises
          .filter((exercise) => progress.exercises[exercise.id]?.passed)
          .map((exercise) => exercise.id),
      ),
  )
  const [justCompleted, setJustCompleted] = useState(false)
  const completionHandled = useRef(progress.lessons[lessonId] !== undefined)

  const passedCount = exercises.filter((exercise) => localPassed.has(exercise.id)).length
  const allPassed = passedCount === exercises.length
  const overallPercent = Math.round((passedCount / exercises.length) * 100)

  function updateResponse(exercise: Exercise, response: ExerciseResponse | null) {
    setResponses((current) => ({ ...current, [exercise.id]: response }))
  }

  function revealHint(exercise: Exercise) {
    setHintsShown((current) => {
      const next = Math.min((current[exercise.id] ?? 0) + 1, exercise.hints.length)
      return { ...current, [exercise.id]: next }
    })
  }

  function retry(exercise: Exercise) {
    setResults((current) => {
      const copy = { ...current }
      delete copy[exercise.id]
      return copy
    })
    if (exercise.kind === 'order') {
      updateResponse(exercise, initialResponse(exercise))
    } else if (exercise.kind === 'subnet') {
      updateResponse(exercise, {
        kind: 'subnet',
        seed: seeds[exercise.id],
        values: {
          network: '',
          broadcast: '',
          firstUsable: '',
          lastUsable: '',
          usableHosts: '',
        },
      })
    } else {
      updateResponse(exercise, null)
    }
  }

  function regenerateSubnet(exercise: SubnetExercise) {
    const seed = newSeed()
    setSeeds((current) => ({ ...current, [exercise.id]: seed }))
    setResults((current) => {
      const copy = { ...current }
      delete copy[exercise.id]
      return copy
    })
    updateResponse(exercise, null)
  }

  function submit(exercise: Exercise) {
    const response = responses[exercise.id]
    if (!isResponseComplete(exercise, response) || !response) return
    const result = gradeExercise(exercise, response)
    setResults((current) => ({ ...current, [exercise.id]: result }))
    recordExercise({
      exerciseId: exercise.id,
      lessonId,
      competency,
      passed: result.passed,
      score: result.score,
      hintsUsed: hintsShown[exercise.id] ?? 0,
    })
    if (result.passed) {
      const nextPassed = new Set(localPassed)
      nextPassed.add(exercise.id)
      setLocalPassed(nextPassed)
      const allNowPassed = exercises.every((candidate) => nextPassed.has(candidate.id))
      if (allNowPassed && !completionHandled.current) {
        completionHandled.current = true
        setJustCompleted(true)
        completeLesson({
          lessonId,
          competency,
          score: Math.round((nextPassed.size / exercises.length) * 100),
          label: lessonTitle,
        })
        onComplete?.()
      }
    }
  }

  const completionMessage = useMemo(
    () =>
      justCompleted
        ? 'Lição concluída. Todos os exercícios foram resolvidos e registrados como evidência de domínio.'
        : 'Você já resolveu todos os exercícios desta lição. Pode revisar as respostas quando quiser.',
    [justCompleted],
  )

  return (
    <section className="exercise-section" aria-labelledby="exercicios-title">
      <div className="exercise-section__head">
        <div>
          <h2 id="exercicios-title">Exercícios da unidade</h2>
          <p>
            Respostas são verificadas localmente, com justificativas. Não há envio de dados para
            serviços externos.
          </p>
        </div>
        <div className="exercise-section__score">
          <span className="mono">{passedCount}/{exercises.length}</span>
          <span>resolvidos</span>
        </div>
      </div>

      <ProgressBar value={overallPercent} label="Progresso dos exercícios" compact />

      {allPassed && (
        <div className="completion-banner" role="status">
          <CheckCircle2 size={20} aria-hidden="true" />
          <div>
            <strong>{justCompleted ? 'Lição recém-concluída' : 'Lição concluída anteriormente'}</strong>
            <p>{completionMessage}</p>
          </div>
        </div>
      )}

      <div className="exercise-list">
        {exercises.map((exercise, index) => {
          const response = responses[exercise.id]
          const result = results[exercise.id]
          const shownHints = hintsShown[exercise.id] ?? 0
          const previouslyPassed = progress.exercises[exercise.id]?.passed && !result
          const seed = seeds[exercise.id]
          const subnetChallenge =
            exercise.kind === 'subnet' ? generateSubnetChallenge(seed ?? exercise.seed) : null

          return (
            <article className="exercise" key={exercise.id} aria-labelledby={`${exercise.id}-title`}>
              <div className="exercise__meta">
                <span className="exercise__number mono">{String(index + 1).padStart(2, '0')}</span>
                <div className="exercise__meta-tags">
                  <Tag tone="neutral">{KIND_LABEL[exercise.kind]}</Tag>
                  <Tag tone={exercise.difficulty === 'avancado' ? 'rust' : 'teal'}>
                    {DIFFICULTY_LABEL[exercise.difficulty]}
                  </Tag>
                  {localPassed.has(exercise.id) && (
                    <Tag tone="green">
                      <CheckCircle2 size={12} aria-hidden="true" /> resolvido
                    </Tag>
                  )}
                </div>
                <span className="exercise__objective">{exercise.objective}</span>
              </div>

              <h3 id={`${exercise.id}-title`}>{exercise.prompt}</h3>
              {exercise.context && <p className="exercise__context">{exercise.context}</p>}

              {exercise.kind === 'subnet' && subnetChallenge && (
                <div className="subnet-prompt">
                  <div>
                    <span className="label">Host analisado</span>
                    <code className="subnet-prompt__ip">{subnetChallenge.hostCidr}</code>
                  </div>
                  <div className="subnet-prompt__seed mono">semente {seed}</div>
                  <p>
                    Preencha os campos. A correção compara rede, broadcast, faixa utilizável e
                    quantidade de hosts. Prefixos /31 e /32 não são usados nesta variação.
                  </p>
                </div>
              )}

              <div className="exercise__form">
                {exercise.kind === 'mcq' && (
                  <fieldset className="choice-list" disabled={Boolean(result)}>
                    <legend className="sr-only">Alternativas</legend>
                    {exercise.choices.map((choice) => {
                      const selected = response?.kind === 'mcq' && response.choiceId === choice.id
                      const isAnswer = choice.id === exercise.answerId
                      return (
                        <label
                          key={choice.id}
                          className={`choice ${selected ? 'choice--selected' : ''} ${
                            result && isAnswer ? 'choice--correct' : ''
                          } ${result && selected && !isAnswer ? 'choice--wrong' : ''}`}
                        >
                          <input
                            type="radio"
                            name={exercise.id}
                            value={choice.id}
                            checked={selected}
                            onChange={() => updateResponse(exercise, { kind: 'mcq', choiceId: choice.id })}
                          />
                          <span className="choice__marker mono">{choice.id.toUpperCase()}</span>
                          <span className="choice__text">
                            {choice.label}
                            {result && (
                              <span className="choice__rationale">{choice.rationale}</span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                )}

                {exercise.kind === 'multi' && (
                  <fieldset className="choice-list" disabled={Boolean(result)}>
                    <legend className="sr-only">Alternativas de seleção múltipla</legend>
                    {exercise.choices.map((choice) => {
                      const selected =
                        response?.kind === 'multi' && response.ids.includes(choice.id)
                      const shouldSelect = exercise.correctIds.includes(choice.id)
                      return (
                        <label
                          key={choice.id}
                          className={`choice ${selected ? 'choice--selected' : ''} ${
                            result && shouldSelect ? 'choice--correct' : ''
                          } ${result && selected && !shouldSelect ? 'choice--wrong' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const current = response?.kind === 'multi' ? response.ids : []
                              const ids = current.includes(choice.id)
                                ? current.filter((id) => id !== choice.id)
                                : [...current, choice.id]
                              updateResponse(exercise, { kind: 'multi', ids })
                            }}
                          />
                          <span className="choice__marker mono">
                            {shouldSelect && result ? '✓' : ''}
                          </span>
                          <span className="choice__text">
                            {choice.label}
                            {result && <span className="choice__rationale">{choice.rationale}</span>}
                          </span>
                        </label>
                      )
                    })}
                  </fieldset>
                )}

                {exercise.kind === 'short' && (
                  <div className="field">
                    <label htmlFor={`${exercise.id}-answer`}>Sua resposta</label>
                    <input
                      id={`${exercise.id}-answer`}
                      type="text"
                      value={response?.kind === 'short' ? response.value : ''}
                      placeholder={exercise.placeholder}
                      disabled={Boolean(result)}
                      onChange={(event) =>
                        updateResponse(exercise, { kind: 'short', value: event.target.value })
                      }
                      autoComplete="off"
                    />
                    <span className="field__hint">
                      Aceita variações de maiúsculas/minúsculas e acentuação quando a resposta é textual.
                    </span>
                  </div>
                )}

                {exercise.kind === 'subnet' && (
                  <div className="subnet-fields">
                    <div className="field">
                      <label htmlFor={`${exercise.id}-network`}>Endereço de rede</label>
                      <input
                        id={`${exercise.id}-network`}
                        inputMode="numeric"
                        placeholder="ex.: 192.168.0.0"
                        value={response?.kind === 'subnet' ? response.values.network : ''}
                        disabled={Boolean(result)}
                        onChange={(event) =>
                          updateResponse(exercise, {
                            kind: 'subnet',
                            seed: seed ?? exercise.seed,
                            values: {
                              ...(response?.kind === 'subnet'
                                ? response.values
                                : {
                                    network: '',
                                    broadcast: '',
                                    firstUsable: '',
                                    lastUsable: '',
                                    usableHosts: '',
                                  }),
                              network: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${exercise.id}-broadcast`}>Broadcast</label>
                      <input
                        id={`${exercise.id}-broadcast`}
                        inputMode="numeric"
                        placeholder="ex.: 192.168.0.255"
                        value={response?.kind === 'subnet' ? response.values.broadcast : ''}
                        disabled={Boolean(result)}
                        onChange={(event) =>
                          updateResponse(exercise, {
                            kind: 'subnet',
                            seed: seed ?? exercise.seed,
                            values: {
                              ...(response?.kind === 'subnet'
                                ? response.values
                                : {
                                    network: '',
                                    broadcast: '',
                                    firstUsable: '',
                                    lastUsable: '',
                                    usableHosts: '',
                                  }),
                              broadcast: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${exercise.id}-first`}>Primeiro host utilizável</label>
                      <input
                        id={`${exercise.id}-first`}
                        inputMode="numeric"
                        value={response?.kind === 'subnet' ? response.values.firstUsable : ''}
                        disabled={Boolean(result)}
                        onChange={(event) =>
                          updateResponse(exercise, {
                            kind: 'subnet',
                            seed: seed ?? exercise.seed,
                            values: {
                              ...(response?.kind === 'subnet'
                                ? response.values
                                : {
                                    network: '',
                                    broadcast: '',
                                    firstUsable: '',
                                    lastUsable: '',
                                    usableHosts: '',
                                  }),
                              firstUsable: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${exercise.id}-last`}>Último host utilizável</label>
                      <input
                        id={`${exercise.id}-last`}
                        inputMode="numeric"
                        value={response?.kind === 'subnet' ? response.values.lastUsable : ''}
                        disabled={Boolean(result)}
                        onChange={(event) =>
                          updateResponse(exercise, {
                            kind: 'subnet',
                            seed: seed ?? exercise.seed,
                            values: {
                              ...(response?.kind === 'subnet'
                                ? response.values
                                : {
                                    network: '',
                                    broadcast: '',
                                    firstUsable: '',
                                    lastUsable: '',
                                    usableHosts: '',
                                  }),
                              lastUsable: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`${exercise.id}-hosts`}>Hosts utilizáveis</label>
                      <input
                        id={`${exercise.id}-hosts`}
                        inputMode="numeric"
                        placeholder="ex.: 254"
                        value={response?.kind === 'subnet' ? response.values.usableHosts : ''}
                        disabled={Boolean(result)}
                        onChange={(event) =>
                          updateResponse(exercise, {
                            kind: 'subnet',
                            seed: seed ?? exercise.seed,
                            values: {
                              ...(response?.kind === 'subnet'
                                ? response.values
                                : {
                                    network: '',
                                    broadcast: '',
                                    firstUsable: '',
                                    lastUsable: '',
                                    usableHosts: '',
                                  }),
                              usableHosts: event.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {exercise.kind === 'order' && response?.kind === 'order' && (
                  <div>
                    <ol className="order-list">
                      {response.order.map((id, position) => {
                        const item = exercise.items.find((candidate) => candidate.id === id)
                        return (
                          <li key={id} className="order-item">
                            <span className="order-item__position mono">
                              {String(position + 1).padStart(2, '0')}
                            </span>
                            <span className="order-item__label">{item?.label}</span>
                            <span className="order-item__buttons">
                              <button
                                type="button"
                                className="icon-button icon-button--small"
                                aria-label={`Mover "${item?.label}" para cima`}
                                disabled={position === 0 || Boolean(result)}
                                onClick={() => {
                                  const order = [...response.order]
                                  ;[order[position - 1], order[position]] = [
                                    order[position],
                                    order[position - 1],
                                  ]
                                  updateResponse(exercise, { kind: 'order', order })
                                }}
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-button icon-button--small"
                                aria-label={`Mover "${item?.label}" para baixo`}
                                disabled={position === response.order.length - 1 || Boolean(result)}
                                onClick={() => {
                                  const order = [...response.order]
                                  ;[order[position + 1], order[position]] = [
                                    order[position],
                                    order[position + 1],
                                  ]
                                  updateResponse(exercise, { kind: 'order', order })
                                }}
                              >
                                <ArrowDown size={15} />
                              </button>
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                    {!result && (
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => updateResponse(exercise, initialResponse(exercise))}
                      >
                        <RefreshCw size={14} aria-hidden="true" />
                        Embaralhar novamente
                      </button>
                    )}
                  </div>
                )}
              </div>

              {exercise.hints.length > 0 && !result && (
                <div className="hints">
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => revealHint(exercise)}
                    disabled={shownHints >= exercise.hints.length}
                  >
                    <Lightbulb size={14} aria-hidden="true" />
                    {shownHints === 0
                      ? 'Revelar uma dica'
                      : shownHints < exercise.hints.length
                        ? `Revelar próxima dica (${shownHints}/${exercise.hints.length})`
                        : 'Todas as dicas reveladas'}
                  </button>
                  {shownHints > 0 && (
                    <ul className="hints__list" aria-live="polite">
                      {exercise.hints.slice(0, shownHints).map((hint, hintIndex) => (
                        <li key={hintIndex}>
                          <span className="mono">Dica {hintIndex + 1}</span> {hint}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="exercise__actions">
                {!result ? (
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={!isResponseComplete(exercise, response)}
                    onClick={() => submit(exercise)}
                  >
                    Verificar resposta
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button--outline"
                    onClick={() => retry(exercise)}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    Tentar novamente
                  </button>
                )}
                {exercise.kind === 'subnet' && (
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => regenerateSubnet(exercise)}
                  >
                    Gerar outra variação
                  </button>
                )}
                {previouslyPassed && <span className="exercise__previous">Resolvido em uma sessão anterior.</span>}
              </div>

              {result && (
                <div
                  className={`result ${result.passed ? 'result--ok' : 'result--attention'}`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="result__head">
                    <strong>{result.passed ? 'Resposta correta' : 'Ainda não'}</strong>
                    <span className="mono">{Math.round(result.score * 100)}%</span>
                  </div>
                  <p>{result.summary}</p>
                  <ResultDetails details={result.details} />
                  <div className="result__explanation">
                    <strong>Por quê</strong>
                    <p>{exercise.explanation}</p>
                  </div>
                  {exercise.kind === 'short' && (
                    <p className="result__sample">
                      Resposta de referência: <code>{exercise.sampleAnswer}</code>
                    </p>
                  )}
                  {!result.passed && exercise.kind === 'order' && (
                    <div className="result__correct-order">
                      <strong>Sequência correta</strong>
                      <ol>
                        {exercise.correctOrder.map((id) => (
                          <li key={id}>
                            {exercise.items.find((candidate) => candidate.id === id)?.label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
