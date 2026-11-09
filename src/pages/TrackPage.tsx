import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FlaskConical,
  FolderSearch,
  ListChecks,
  LockKeyhole,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getTrack, getTrackLessons, labs, lessons, tracks } from '../data/courses'
import { investigationCases } from '../data/cases'
import { COMPETENCIES, competencyLevel, competencyPoints } from '../lib/progress'
import {
  accessForContent,
  accessForTrack,
  effectiveLevel,
  levelLabel,
  nextActivity,
  trackLevelLabel,
} from '../lib/progression'
import { MetaItem, PageHeader, ProgressBar, SectionHeading, Tag } from '../components/ui'

export function TrackPage() {
  const { trackId } = useParams()
  const track = trackId ? getTrack(trackId) : undefined
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  if (!track) return <Navigate to="/nao-encontrado" replace />
  if (!account) return null

  const trackLessons = getTrackLessons(track)
  const completed = trackLessons.filter((lesson) => progress.lessons[lesson.id]).length
  const percent = trackLessons.length ? Math.round((completed / trackLessons.length) * 100) : 0
  const trackAccess = accessForTrack(track.id, account.expertise, progress, { admin: isAdmin })
  const level = effectiveLevel(account.expertise, progress)
  const recommendation = nextActivity(account.expertise, progress, { admin: isAdmin })
  const nextAccessible =
    trackLessons.find((lesson) => {
      const access = accessForContent(lesson.id, account.expertise, progress, { admin: isAdmin })
      return access.allowed && !access.completed
    }) ??
    trackLessons.find((lesson) => {
      const access = accessForContent(lesson.id, account.expertise, progress, { admin: isAdmin })
      return access.accessible && !access.completed
    })
  const linkedLabs = labs.filter((lab) => track.modules.some((module) => module.labIds?.includes(lab.id)))
  const linkedCases = investigationCases.filter((caseDefinition) =>
    track.modules.some((module) => module.caseIds?.includes(caseDefinition.id)),
  )
  const trackIndex = tracks.findIndex((candidate) => candidate.id === track.id)
  const nextTrack = tracks[trackIndex + 1]
  const totalExercises = trackLessons.reduce((total, lesson) => total + lesson.exercises.length, 0)
  const solvedExercises = trackLessons.reduce(
    (total, lesson) =>
      total + lesson.exercises.filter((exercise) => progress.exercises[exercise.id]?.passed).length,
    0,
  )
  const activeModules = track.modules.filter((module) => module.status === 'disponivel').length

  return (
    <div>
      <PageHeader
        title={track.title}
        lede={track.description}
        meta={
          <>
            <span className="meta-item">Trilha {track.code}</span>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">
              {activeModules} {activeModules === 1 ? 'módulo ativo' : 'módulos ativos'}
            </span>
            <MetaItem icon={<BookOpen size={14} aria-hidden="true" />}>
              {trackLessons.length} lições disponíveis
            </MetaItem>
            <MetaItem icon={<ListChecks size={14} aria-hidden="true" />}>
              {totalExercises} exercícios
            </MetaItem>
            <MetaItem icon={<FlaskConical size={14} aria-hidden="true" />}>
              {linkedLabs.length} {linkedLabs.length === 1 ? 'laboratório' : 'laboratórios'}
            </MetaItem>
            {linkedCases.length > 0 && (
              <MetaItem icon={<FolderSearch size={14} aria-hidden="true" />}>
                {linkedCases.length} {linkedCases.length === 1 ? 'caso aplicado' : 'casos aplicados'}
              </MetaItem>
            )}
          </>
        }
        actions={
          nextAccessible ? (
            <Link className="button button--primary" to={`/licoes/${nextAccessible.id}`}>
              {completed === 0 ? 'Iniciar trilha' : 'Continuar'} <ArrowRight size={16} />
            </Link>
          ) : !trackAccess.allowed && recommendation?.href ? (
            <Link className="button button--outline" to={recommendation.href}>
              Ver próximo passo <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />

      {!trackAccess.allowed && (
        <section className="access-note" aria-labelledby="track-access-title">
          <LockKeyhole size={18} aria-hidden="true" />
          <div>
            <h2 id="track-access-title">
              Esta trilha começa no nível {trackLevelLabel(track.id)}.
            </h2>
            <p>
              Seu nível efetivo atual é {level.label}. O programa permanece visível para orientar a
              jornada, mas as atividades não podem ser abertas enquanto o nível e os pré-requisitos
              correspondentes não forem demonstrados.
            </p>
            {recommendation?.href && (
              <Link className="text-link" to={recommendation.href}>
                Próximo passo: {recommendation.title}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="overview-strip">
        <div className="overview-strip__progress">
          <span className="label">Progresso da trilha</span>
          <strong className="mono">{completed}/{trackLessons.length}</strong>
          <ProgressBar value={percent} label={`${percent}% concluído`} compact />
        </div>
        <div className="overview-strip__split">
          <div>
            <span className="label">Exercícios resolvidos</span>
            <strong className="mono">{solvedExercises}/{totalExercises}</strong>
          </div>
          <div>
            <span className="label">Resultado esperado</span>
            <p>{track.outcome}</p>
          </div>
        </div>
      </div>

      <div className="track-layout">
        <div className="track-main">
          <section className="page-section">
            <SectionHeading
              title="Unidades e prática"
              description="Cada lição combina uma explicação curta com exercícios corrigidos e justificados."
            />
            <div className="module-list">
              {track.modules.map((module, moduleIndex) => {
                const moduleLessons = module.lessonIds
                  .map((id) => lessons.find((lesson) => lesson.id === id))
                  .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
                const moduleLabs = labs.filter((lab) => module.labIds?.includes(lab.id))
                const moduleCases = investigationCases.filter((caseDefinition) =>
                  module.caseIds?.includes(caseDefinition.id),
                )
                return (
                  <article className={`module-block module-block--${module.status}`} key={module.id}>
                    <header className="module-block__header">
                      <div>
                        <div className="module-block__title-row">
                          <span className="module-block__code mono">
                            {track.code}.{moduleIndex + 1}
                          </span>
                          <h3>{module.title}</h3>
                          <Tag tone={module.status === 'disponivel' ? 'green' : 'neutral'}>
                            {module.status === 'disponivel' ? 'disponível' : 'em expansão'}
                          </Tag>
                        </div>
                        <p>{module.summary}</p>
                      </div>
                    </header>

                    {moduleLessons.length > 0 && (
                      <ol className="lesson-list">
                        {moduleLessons.map((lesson, lessonIndex) => {
                          const isComplete = Boolean(progress.lessons[lesson.id])
                          const solved = lesson.exercises.filter(
                            (exercise) => progress.exercises[exercise.id]?.passed,
                          ).length
                          const access = accessForContent(
                            lesson.id,
                            account.expertise,
                            progress,
                            { admin: isAdmin },
                          )
                          const locked = !access.allowed && !access.historical
                          const reason =
                            access.reason === 'nivel'
                              ? `A partir do nível ${levelLabel(access.minLevel)}`
                              : access.missingContent.length > 0
                                ? `Requer: ${access.missingContent.map((item) => item.title).join(', ')}`
                                : 'Pré-requisito pendente'
                          return (
                            <li key={lesson.id}>
                              <Link
                                to={`/licoes/${lesson.id}`}
                                className={`lesson-row ${locked ? 'lesson-row--locked' : ''}`}
                              >
                                <span
                                  className={`lesson-row__status ${isComplete ? 'is-complete' : ''} ${locked ? 'is-locked' : ''}`}
                                >
                                  {isComplete ? (
                                    <CheckCircle2 size={17} aria-label="Concluída" />
                                  ) : locked ? (
                                    <LockKeyhole size={16} aria-label="Bloqueada" />
                                  ) : (
                                    <span className="mono">{String(lessonIndex + 1).padStart(2, '0')}</span>
                                  )}
                                </span>
                                <div className="lesson-row__copy">
                                  <div className="lesson-row__title">
                                    <h4>{lesson.title}</h4>
                                    <span className="mono">{lesson.minutes} min</span>
                                  </div>
                                  <p>{lesson.summary}</p>
                                  <div className="lesson-row__meta">
                                    <span>
                                      {solved}/{lesson.exercises.length} exercícios
                                    </span>
                                    <span>{lesson.objectives.length} objetivos</span>
                                    {access.inProgress && !isComplete && (
                                      <Tag tone="amber">em andamento</Tag>
                                    )}
                                    {locked && <span className="lesson-row__lock">{reason}</span>}
                                  </div>
                                </div>
                                <ChevronRight size={18} aria-hidden="true" />
                              </Link>
                            </li>
                          )
                        })}
                      </ol>
                    )}

                    <div className="module-block__linked">
                      {moduleLabs.map((lab) => {
                        const access = accessForContent(lab.id, account.expertise, progress, {
                          admin: isAdmin,
                        })
                        const locked = !access.allowed && !access.historical
                        return (
                          <Link
                            to={lab.route}
                            className={`linked-practice ${locked ? 'linked-practice--locked' : ''}`}
                            key={lab.id}
                          >
                            {locked ? (
                              <LockKeyhole size={18} aria-hidden="true" />
                            ) : (
                              <FlaskConical size={18} aria-hidden="true" />
                            )}
                            <div>
                              <strong>{lab.title}</strong>
                              <span className="mono">
                                {locked ? 'Ver requisitos' : 'Laboratório'}
                              </span>
                            </div>
                            <ChevronRight size={16} aria-hidden="true" />
                          </Link>
                        )
                      })}
                      {moduleCases.map((caseDefinition) => {
                        const access = accessForContent(
                          caseDefinition.id,
                          account.expertise,
                          progress,
                          { admin: isAdmin },
                        )
                        const locked = !access.allowed && !access.historical
                        return (
                          <Link
                            to={`/casos/${caseDefinition.id}`}
                            className={`linked-practice ${locked ? 'linked-practice--locked' : ''}`}
                            key={caseDefinition.id}
                          >
                            {locked ? (
                              <LockKeyhole size={18} aria-hidden="true" />
                            ) : (
                              <FolderSearch size={18} aria-hidden="true" />
                            )}
                            <div>
                              <strong>{caseDefinition.title}</strong>
                              <span className="mono">
                                {locked ? 'Ver requisitos' : 'Caso pericial'}
                              </span>
                            </div>
                            <ChevronRight size={16} aria-hidden="true" />
                          </Link>
                        )
                      })}
                      {module.status === 'em-expansao' && (
                        <div className="module-expansion">
                          <Clock size={17} aria-hidden="true" />
                          <p>
                            Conteúdo em expansão, ainda não disponível nesta versão. Não há botão ou
                            atividade fictícia associada a este módulo.
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          {nextTrack && (
            <nav className="next-track" aria-label="Próxima trilha">
              <Link to={`/trilhas/${nextTrack.id}`}>
                <div>
                  <h3>{nextTrack.title}</h3>
                  <p>{nextTrack.tagline}</p>
                  <span className="next-track__meta mono">Trilha {nextTrack.code}</span>
                </div>
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </nav>
          )}
        </div>

        <aside className="track-aside">
          <div className="aside-panel">
            <h2 className="aside-panel__title">Competências da trilha</h2>
            {track.competency.map((competencyId) => {
              const competency = COMPETENCIES.find((candidate) => candidate.id === competencyId)
              if (!competency) return null
              const points = competencyPoints(progress, competencyId)
              return (
                <div className="aside-competency" key={competencyId}>
                  <div>
                    <strong>{competency.label}</strong>
                    <span className="mono">{points}/100</span>
                  </div>
                  <div className="mini-level__bar">
                    <span style={{ width: `${points}%` }} />
                  </div>
                  <p>{competency.description}</p>
                  <span className="aside-competency__level">{competencyLevel(points).label}</span>
                </div>
              )
            })}
          </div>
          <div className="aside-panel aside-panel--muted">
            <h2 className="aside-panel__title">Como a conclusão é registrada</h2>
            <ul className="plain-list">
              <li>Lição: todos os exercícios resolvidos.</li>
              <li>Laboratório: objetivo técnico verificado pelo motor do cenário.</li>
              <li>Caso: relatório submetido e avaliado por rubrica.</li>
            </ul>
            <Link to="/progresso" className="text-link">
              Ver registro completo <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
