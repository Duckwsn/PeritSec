import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FlaskConical,
  FolderSearch,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getTrackLessons, lessons, tracks, type Lesson } from '../data/courses'
import { investigationCases } from '../data/cases'
import { LAB_SCENARIOS } from '../lib/network'
import {
  COMPETENCIES,
  completedExerciseCount,
  competencyLevel,
  competencyPoints,
  formatDateTime,
  getCaseProgress,
  submittedCaseAverage,
  submittedCaseCount,
  type ActivityType,
  type CompetencyId,
  type ProgressState,
} from '../lib/progress'
import { effectiveLevel } from '../lib/progression'
import { formatBytes, type BackupSummary } from '../lib/storage'
import {
  EmptyState,
  PageHeader,
  ProgressBar,
  SectionHeading,
  Tag,
} from '../components/ui'

const totalExercises = lessons.reduce((total, lesson) => total + lesson.exercises.length, 0)
const labUnits = LAB_SCENARIOS.length + 2

const activityLabel: Record<ActivityType, string> = {
  exercicio: 'Exercício',
  licao: 'Lição',
  laboratorio: 'Laboratório',
  caso: 'Caso',
  sistema: 'Sistema',
}

const competencyTone: Record<CompetencyId, 'teal' | 'blue' | 'amber' | 'rust' | 'green'> = {
  redes: 'teal',
  diagnostico: 'blue',
  seguranca: 'amber',
  forense: 'rust',
  cripto: 'green',
}

function formatDateFile(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface ReviewCandidate {
  exerciseId: string
  exercisePrompt: string
  lesson: Lesson
  reason: string
  priority: number
  lastAt: string
}

/**
 * Regra de revisão espaçada, deliberadamente simples e auditável:
 * 1. resposta ainda incorreta;
 * 2. acerto obtido com pista;
 * 3. acerto após mais de uma tentativa;
 * 4. acerto com mais de 7 dias.
 * A fila não altera pontuação nem bloqueia avanço; apenas sugere prática.
 */
function buildReviewQueue(state: ProgressState): ReviewCandidate[] {
  const lessonByExercise = new Map<string, Lesson>()
  for (const lesson of lessons) {
    for (const exercise of lesson.exercises) {
      lessonByExercise.set(exercise.id, lesson)
    }
  }

  const now = Date.now()
  const candidates: ReviewCandidate[] = []
  for (const [exerciseId, record] of Object.entries(state.exercises)) {
    const lesson = lessonByExercise.get(exerciseId)
    if (!lesson) continue
    const exercise = lesson.exercises.find((item) => item.id === exerciseId)
    if (!exercise) continue
    const ageDays = Math.floor((now - new Date(record.lastAt).getTime()) / 86_400_000)

    if (!record.passed) {
      candidates.push({
        exerciseId,
        exercisePrompt: exercise.prompt,
        lesson,
        reason: 'Resposta ainda incorreta',
        priority: 0,
        lastAt: record.lastAt,
      })
    } else if (record.hintsUsed > 0) {
      candidates.push({
        exerciseId,
        exercisePrompt: exercise.prompt,
        lesson,
        reason: 'Acerto obtido com pista',
        priority: 1,
        lastAt: record.lastAt,
      })
    } else if (record.attempts > 1) {
      candidates.push({
        exerciseId,
        exercisePrompt: exercise.prompt,
        lesson,
        reason: 'Acerto após mais de uma tentativa',
        priority: 2,
        lastAt: record.lastAt,
      })
    } else if (ageDays >= 7) {
      candidates.push({
        exerciseId,
        exercisePrompt: exercise.prompt,
        lesson,
        reason: `Acerto registrado há ${ageDays} dias`,
        priority: 3,
        lastAt: record.lastAt,
      })
    }
  }

  return candidates
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        new Date(left.lastAt).getTime() - new Date(right.lastAt).getTime(),
    )
    .slice(0, 3)
}

export function ProgressPage() {
  const { account } = useAuth()
  const {
    progress,
    storageAvailable,
    storageMode,
    storageDataDir,
    storageUpdatedAt,
    storageError,
    backupNow,
    listBackups,
    restoreBackup,
    resetAll,
  } = useProgress()
  const [resetArmed, setResetArmed] = useState(false)
  const [dataMessage, setDataMessage] = useState('')
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [backupFeedback, setBackupFeedback] = useState<{
    tone: 'ok' | 'warn'
    text: string
  } | null>(null)
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreArmedId, setRestoreArmedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (storageMode !== 'sqlite') return
    void listBackups().then((items) => {
      if (!cancelled) setBackups(items)
    })
    return () => {
      cancelled = true
    }
  }, [storageMode, listBackups])

  if (!account) return null
  const username = account.username
  const level = effectiveLevel(account.expertise, progress)
  const completedLessons = Object.keys(progress.lessons).length
  const passedExercises = completedExerciseCount(progress)
  const networkScenarios = Object.keys(progress.labs).filter((id) =>
    id.startsWith('lab-redes:'),
  ).length
  const completedLabUnits =
    networkScenarios +
    (progress.labs['lab-trafego'] ? 1 : 0) +
    (progress.labs['lab-cripto'] ? 1 : 0)
  const submittedCases = submittedCaseCount(progress)
  const caseAverage = submittedCaseAverage(progress)
  const reviewQueue = buildReviewQueue(progress)

  async function handleBackup() {
    setBackupBusy(true)
    setBackupFeedback(null)
    const result = await backupNow()
    if (result.ok && result.backup) {
      setBackups(await listBackups())
      setBackupFeedback({
        tone: 'ok',
        text: `Backup criado: ${result.backup.fileName}`,
      })
    } else {
      setBackupFeedback({
        tone: 'warn',
        text: result.error ?? 'Não foi possível criar o backup.',
      })
    }
    setBackupBusy(false)
  }

  async function handleRestore(id: number) {
    setBackupBusy(true)
    setBackupFeedback(null)
    const result = await restoreBackup(id)
    if (result.ok) {
      setBackups(await listBackups())
      setRestoreArmedId(null)
      setBackupFeedback({
        tone: 'ok',
        text: 'Backup restaurado. O estado atual foi salvo antes da substituição.',
      })
    } else {
      setBackupFeedback({
        tone: 'warn',
        text: result.error ?? 'Não foi possível restaurar o backup.',
      })
    }
    setBackupBusy(false)
  }

  function evidenceCounts(competency: CompetencyId) {
    return {
      exercises: Object.values(progress.exercises).filter(
        (record) => record.competency === competency && record.passed,
      ).length,
      lessons: Object.values(progress.lessons).filter(
        (record) => record.competency === competency,
      ).length,
      labs: Object.values(progress.labs).filter(
        (record) => record.competency === competency,
      ).length,
      cases: competency === 'forense' ? submittedCases : 0,
    }
  }

  function exportProgress() {
    const payload = {
      aplicacao: 'PeritSec',
      conta: username,
      versaoProgresso: progress.version,
      exportadoEm: new Date().toISOString(),
      observacao:
        'Exportação local de progresso. Não inclui dados de terceiros, credenciais ou capturas reais.',
      progresso: progress,
    }
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `peritsec-${username}-progresso-${formatDateFile()}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setDataMessage('Exportação iniciada pelo navegador.')
    } catch {
      setDataMessage('O navegador não permitiu iniciar a exportação.')
    }
  }

  function confirmReset() {
    resetAll()
    setResetArmed(false)
    setDataMessage('Progresso apagado. A alteração será persistida no armazenamento ativo.')
  }

  return (
    <div className="progress-page">
      <PageHeader
        title="Progresso por competência e evidências registradas."
        lede="A pontuação por competência deriva de exercícios resolvidos, lições concluídas, laboratórios verificados e relatórios submetidos. Não há progresso por tempo de tela nem por páginas abertas."
        meta={
          <>
            <span className="meta-item">
              <ShieldCheck size={14} aria-hidden="true" />{' '}
              {storageMode === 'sqlite'
                ? 'SQLite local ativo, por conta'
                : storageMode === 'checking'
                  ? 'verificando persistência'
                  : 'servidor local indisponível'}
            </span>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">
              <Activity size={14} aria-hidden="true" /> {progress.activity.length} eventos recentes
            </span>
            <span className="meta-item">
              <Clock size={14} aria-hidden="true" /> histórico limitado a 80 entradas
            </span>
          </>
        }
        actions={
          <div className="button-row">
            <button type="button" className="button button--outline" onClick={exportProgress}>
              <Download size={15} aria-hidden="true" /> Exportar JSON
            </button>
            <Link className="button button--primary" to="/trilhas">
              Continuar percurso <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {!storageAvailable && (
        <div className="inline-warning" role="alert">
          <TriangleAlert size={17} aria-hidden="true" />
          <div>
            <strong>O servidor local não confirmou a gravação.</strong>
            <p>
              As alterações desta sessão ficam pendentes no navegador e não são gravadas em outra
              conta. Verifique se a API local está em execução antes de fechar a página.
            </p>
          </div>
        </div>
      )}

      <div className="progress-summary" aria-label="Resumo de progresso">
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">
            {completedLessons}
            <small>/{lessons.length}</small>
          </span>
          <span className="progress-summary__label">lições concluídas</span>
          <span className="progress-summary__hint">todos os exercícios resolvidos</span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">
            {passedExercises}
            <small>/{totalExercises}</small>
          </span>
          <span className="progress-summary__label">exercícios com acerto</span>
          <span className="progress-summary__hint">primeira resolução ou revisão</span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">
            {completedLabUnits}
            <small>/{labUnits}</small>
          </span>
          <span className="progress-summary__label">cenários e laboratórios</span>
          <span className="progress-summary__hint">objetivo verificado pelo motor</span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">
            {submittedCases}
            <small>/{investigationCases.length}</small>
          </span>
          <span className="progress-summary__label">relatórios submetidos</span>
          <span className="progress-summary__hint">
            {caseAverage === null ? 'sem média ainda' : `média de ${caseAverage}/100`}
          </span>
        </div>
      </div>

      <section aria-labelledby="competencies-title">
        <SectionHeading
          title="Mapa de competências"
          description="Cada competência acumula pontos apenas por evidências registradas. O nível é descritivo, não uma certificação."
          action={
            <Link className="text-link" to="/metodologia">
              Entender o cálculo <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <div className="competency-ledger" id="competencies-title">
          {COMPETENCIES.map((competency) => {
            const points = competencyPoints(progress, competency.id)
            const level = competencyLevel(points)
            const evidence = evidenceCounts(competency.id)
            return (
              <article className="competency-record" key={competency.id}>
                <div className="competency-record__head">
                  <div>
                    <span className="mono competency-record__code">
                      {competency.short.toUpperCase()}
                    </span>
                    <h3>{competency.label}</h3>
                  </div>
                  <Tag tone={competencyTone[competency.id]}>{level.label}</Tag>
                </div>
                <p className="competency-record__description">{competency.description}</p>
                <ProgressBar
                  value={points}
                  label={`${competency.short} · ${points} pontos`}
                  tone={competencyTone[competency.id] === 'amber' ? 'amber' : 'teal'}
                  compact
                />
                <dl className="evidence-counts">
                  <div>
                    <dt>Exercícios</dt>
                    <dd className="mono">{evidence.exercises}</dd>
                  </div>
                  <div>
                    <dt>Lições</dt>
                    <dd className="mono">{evidence.lessons}</dd>
                  </div>
                  <div>
                    <dt>Laboratórios</dt>
                    <dd className="mono">{evidence.labs}</dd>
                  </div>
                  <div>
                    <dt>Casos</dt>
                    <dd className="mono">{evidence.cases}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="tracks-progress-title">
        <SectionHeading
          title="Trilhas e unidades"
          description="O avanço é contado por unidades concluídas. Uma unidade é concluída quando todos os exercícios da lição são resolvidos."
          action={
            <Link className="text-link" to="/trilhas">
              Ver todas as trilhas <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <div className="track-progress-list" id="tracks-progress-title">
          {tracks.map((track) => {
            const trackLessons = getTrackLessons(track)
            const completed = trackLessons.filter((lesson) => progress.lessons[lesson.id]).length
            const percent = trackLessons.length
              ? Math.round((completed / trackLessons.length) * 100)
              : 0
            const trackExercises = trackLessons.flatMap((lesson) => lesson.exercises)
            const solved = trackExercises.filter(
              (exercise) => progress.exercises[exercise.id]?.passed,
            ).length
            return (
              <Link className="track-progress-row" to={`/trilhas/${track.id}`} key={track.id}>
                <span className="track-progress-row__code mono">{track.code}</span>
                <span className="track-progress-row__copy">
                  <strong>{track.title}</strong>
                  <small>{track.tagline}</small>
                </span>
                <span className="track-progress-row__metrics mono">
                  {completed}/{trackLessons.length} lições · {solved}/{trackExercises.length} exercícios
                </span>
                <span className="track-progress-row__bar">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="mono track-progress-row__percent">{percent}%</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="cases-progress-title">
        <SectionHeading
          title="Casos e relatórios"
          description="Resultados de casos são avaliados por rubrica explícita. Um caso aberto não gera nota até a submissão."
          action={
            <Link className="text-link" to="/casos">
              Abrir casos <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <div className="case-progress-list" id="cases-progress-title">
          {investigationCases.map((caseDefinition) => {
            const caseProgress = getCaseProgress(progress, caseDefinition.id)
            const submitted = caseProgress.submitted
            const started =
              caseProgress.evidenceOpened.length > 0 ||
              caseProgress.actions.length > 0 ||
              caseProgress.notes &&
              Object.values(caseProgress.notes).some(Boolean)
            return (
              <article className="case-progress-row" key={caseDefinition.id}>
                <span className="case-progress-row__icon" aria-hidden="true">
                  <FolderSearch size={19} />
                </span>
                <div className="case-progress-row__copy">
                  <div>
                    <span className="mono">{caseDefinition.code}</span>
                    {submitted ? (
                      <Tag tone={submitted.passed ? 'green' : 'rust'}>
                        {submitted.passed ? 'critérios atingidos' : 'revisão recomendada'}
                      </Tag>
                    ) : started ? (
                      <Tag tone="amber">em análise</Tag>
                    ) : (
                      <Tag tone="neutral">não iniciado</Tag>
                    )}
                  </div>
                  <h3>{caseDefinition.title}</h3>
                  <p>{caseDefinition.subtitle}</p>
                </div>
                <div className="case-progress-row__score">
                  {submitted ? (
                    <>
                      <strong className="mono">{submitted.score}</strong>
                      <span>/100</span>
                      <small>{formatDateTime(submitted.at)}</small>
                    </>
                  ) : (
                    <span className="muted">sem submissão</span>
                  )}
                </div>
                <Link className="button button--outline button--small" to={`/casos/${caseDefinition.id}`}>
                  {submitted ? 'Revisar análise' : started ? 'Continuar análise' : 'Abrir caso'}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="review-title">
        <SectionHeading
          title="Revisão recomendada"
          description="A fila prioriza resposta incorreta, acerto com pista, múltiplas tentativas e acertos antigos. É uma sugestão de prática, não uma penalidade nem um bloqueio."
        />
        <div id="review-title">
          {reviewQueue.length === 0 ? (
            <EmptyState
              title="Nenhuma revisão prioritária no momento."
              description="Quando houver resposta incorreta, uso de pista, tentativa repetida ou acerto com mais de sete dias, o exercício correspondente aparece aqui."
              action={
                <Link className="button button--outline" to="/licoes/caminho-do-pacote">
                  <BookOpen size={15} aria-hidden="true" /> Abrir uma lição
                </Link>
              }
            />
          ) : (
            <ol className="review-list">
              {reviewQueue.map((candidate) => (
                <li className="review-row" key={candidate.exerciseId}>
                  <span className="review-row__index mono" aria-hidden="true">
                    {String(candidate.priority + 1).padStart(2, '0')}
                  </span>
                  <div className="review-row__copy">
                    <div className="review-row__meta">
                      <Tag tone={competencyTone[candidate.lesson.competency]}>
                        {COMPETENCIES.find((item) => item.id === candidate.lesson.competency)
                          ?.short ?? candidate.lesson.competency}
                      </Tag>
                      <span>{candidate.reason}</span>
                      <time className="mono" dateTime={candidate.lastAt}>
                        {formatDateTime(candidate.lastAt)}
                      </time>
                    </div>
                    <p>{candidate.exercisePrompt}</p>
                    <small>{candidate.lesson.title}</small>
                  </div>
                  <Link
                    className="button button--outline button--small"
                    to={`/licoes/${candidate.lesson.id}`}
                  >
                    Revisar <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section aria-labelledby="activity-title">
        <SectionHeading
          title="Histórico de atividade"
          description="Registro local das ações que alteraram o progresso. Não inclui respostas completas de exercícios."
        />
        <div className="activity-ledger" id="activity-title">
          {progress.activity.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade registrada."
              description="Resolva um exercício, conclua uma lição ou verifique um objetivo de laboratório para iniciar o histórico."
              action={
                <Link className="button button--primary" to="/trilhas">
                  <BookOpen size={15} aria-hidden="true" /> Começar pela trilha A
                </Link>
              }
            />
          ) : (
            <ol className="activity-history">
              {progress.activity.slice(0, 30).map((item) => (
                <li key={item.id} className="activity-row">
                  <span className={`activity-row__mark activity-row__mark--${item.type}`} aria-hidden="true">
                    {item.type === 'licao' ? (
                      <BookOpen size={14} />
                    ) : item.type === 'laboratorio' ? (
                      <FlaskConical size={14} />
                    ) : item.type === 'caso' ? (
                      <FolderSearch size={14} />
                    ) : item.type === 'exercicio' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Activity size={14} />
                    )}
                  </span>
                  <div className="activity-row__copy">
                    <div>
                      <Tag tone="neutral">{activityLabel[item.type]}</Tag>
                      <time className="mono" dateTime={item.at}>
                        {formatDateTime(item.at)}
                      </time>
                    </div>
                    <p>{item.label}</p>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                  {item.href && (
                    <Link className="activity-row__link" to={item.href} aria-label={`Abrir ${item.label}`}>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="data-section" aria-labelledby="data-title">
        <SectionHeading
          title="Onde seu progresso está"
          description="O estado é gravado em SQLite no computador, em um registro separado para esta conta. Sem o servidor local, a gravação fica pausada e a interface informa o problema."
        />
        <div className="data-panel" id="data-title">
          <div className="data-panel__copy">
            <div className="storage-status">
              <span className="storage-status__badge">
                {storageMode === 'sqlite' ? (
                  <Database size={15} aria-hidden="true" />
                ) : (
                  <HardDrive size={15} aria-hidden="true" />
                )}
                {storageMode === 'sqlite'
                  ? `SQLite local · ${username}`
                  : storageMode === 'checking'
                    ? 'verificando servidor local'
                    : 'servidor local indisponível'}
              </span>
              {storageMode === 'sqlite' && storageUpdatedAt && (
                <span className="mono storage-status__time">
                  última gravação em {formatDateTime(storageUpdatedAt)}
                </span>
              )}
            </div>
            <h3>Persistência, cópias e remoção</h3>
            {storageMode === 'sqlite' ? (
              <>
                <p>
                  O estado desta conta é gravado em SQLite em{' '}
                  <code>{storageDataDir || 'diretório de dados do aplicativo'}</code>. Outras contas
                  desta instalação não leem nem recebem este histórico. Não existe cópia automática
                  em <code>localStorage</code>.
                </p>
                <p>
                  Cada backup é um arquivo JSON vinculado a esta conta no mesmo diretório de dados,
                  com hash SHA-256 registrado. A restauração confere o hash e cria uma cópia de
                  segurança do estado atual antes de substituí-lo.
                </p>
              </>
            ) : storageMode === 'checking' ? (
              <p>Verificando se o servidor local está disponível para gravar em SQLite.</p>
            ) : (
              <>
                <p>
                  O servidor local não respondeu. A gravação em SQLite está pausada; o progresso
                  exibido não é enviado a outra conta nem substituído silenciosamente por um estado
                  anônimo.
                </p>
                <p>
                  Para retomar a persistência, inicie o aplicativo com <code>npm run dev</code> ou{' '}
                  <code>npm start</code> e recarregue a página. A conta continua sendo a mesma
                  enquanto a sessão local estiver válida.
                </p>
                {storageError && (
                  <p className="data-panel__error">Detalhe técnico: {storageError}.</p>
                )}
              </>
            )}
            <p>
              A exportação gera um JSON com o estado atual, que pode conter suas respostas de
              relatório e anotações de caso. Guarde o arquivo com o mesmo cuidado com que trataria
              uma anotação de trabalho. Apagar o progresso remove lições, exercícios, laboratórios,
              casos e histórico do armazenamento ativo; a operação não pode ser desfeita.
            </p>
          </div>
          <div className="data-panel__actions">
            <button type="button" className="button button--outline" onClick={exportProgress}>
              <Download size={15} aria-hidden="true" /> Baixar progresso (.json)
            </button>
            {storageMode === 'sqlite' && (
              <button
                type="button"
                className="button button--outline"
                onClick={handleBackup}
                disabled={backupBusy}
              >
                <Archive size={15} aria-hidden="true" />{' '}
                {backupBusy ? 'Criando backup…' : 'Criar backup agora'}
              </button>
            )}
            {!resetArmed ? (
              <button
                type="button"
                className="button button--quiet button--danger-text"
                onClick={() => {
                  setResetArmed(true)
                  setDataMessage('')
                }}
              >
                <RotateCcw size={15} aria-hidden="true" /> Apagar progresso
              </button>
            ) : (
              <div className="reset-confirm">
                <p>Apagar todo o progresso do armazenamento ativo?</p>
                <div className="button-row">
                  <button type="button" className="button button--danger" onClick={confirmReset}>
                    Sim, apagar definitivamente
                  </button>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => setResetArmed(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {dataMessage && (
              <p className="inline-feedback inline-feedback--ok" role="status">
                <CheckCircle2 size={14} aria-hidden="true" /> {dataMessage}
              </p>
            )}
          </div>
        </div>

        {storageMode === 'sqlite' && (
          <div className="backup-panel">
            <div className="backup-panel__head">
              <h3>Cópias desta conta no computador</h3>
              <span className="mono">
                {backups.length} {backups.length === 1 ? 'arquivo' : 'arquivos'}
              </span>
            </div>
            {backups.length === 0 ? (
              <p className="backup-panel__empty">
                Nenhum backup criado ainda. A primeira cópia pode ser gerada pelo botão acima.
              </p>
            ) : (
              <ol className="backup-list">
                {backups.map((backup) => (
                  <li className="backup-row" key={backup.id}>
                    <div className="backup-row__copy">
                      <code>{backup.fileName}</code>
                      <span>
                        {formatDateTime(backup.createdAt)} · {formatBytes(backup.sizeBytes)}
                      </span>
                      <span className="mono backup-row__hash" title={backup.sha256}>
                        SHA-256 {backup.sha256.slice(0, 12)}…
                      </span>
                    </div>
                    {restoreArmedId === backup.id ? (
                      <div className="backup-row__confirm">
                        <span>Substituir o estado atual por esta cópia?</span>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button button--outline button--small"
                            onClick={() => handleRestore(backup.id)}
                            disabled={backupBusy}
                          >
                            {backupBusy ? 'Restaurando…' : 'Confirmar restauração'}
                          </button>
                          <button
                            type="button"
                            className="button button--quiet button--small"
                            onClick={() => setRestoreArmedId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => {
                          setRestoreArmedId(backup.id)
                          setBackupFeedback(null)
                        }}
                      >
                        <Archive size={14} aria-hidden="true" /> Restaurar
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {backupFeedback && (
              <p
                className={`inline-feedback ${
                  backupFeedback.tone === 'ok' ? 'inline-feedback--ok' : 'inline-feedback--warn'
                }`}
                role="status"
              >
                {backupFeedback.tone === 'ok' ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <TriangleAlert size={14} aria-hidden="true" />
                )}
                {backupFeedback.text}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="inline-actions">
        <Link className="text-link" to="/metodologia">
          Metodologia, avaliação e limites <ArrowRight size={14} aria-hidden="true" />
        </Link>
        <Link className="text-link" to="/casos/portal-fora-do-ar">
          Voltar ao caso completo <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
