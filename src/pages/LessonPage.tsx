import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FlaskConical,
  FolderSearch,
  Target,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getLesson, getNextLesson, getTrack, labs, lessons } from '../data/courses'
import { investigationCases } from '../data/cases'
import { COMPETENCIES } from '../lib/progress'
import { accessForContent, nextActivity } from '../lib/progression'
import { useEnterContent } from '../hooks/useEnterContent'
import { ContentGate } from '../components/ContentGate'
import { LessonContent } from '../components/LessonContent'
import { ExercisePlayer } from '../components/ExercisePlayer'
import { MetaItem, Tag } from '../components/ui'

const difficultyLabel = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export function LessonPage() {
  const { lessonId } = useParams()
  const lesson = lessonId ? getLesson(lessonId) : undefined
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  const access = lesson && account
    ? accessForContent(lesson.id, account.expertise, progress, { admin: isAdmin })
    : null
  const recommendation = account
    ? nextActivity(account.expertise, progress, { admin: isAdmin })
    : null
  useEnterContent(Boolean(access?.accessible))
  if (!lesson) return <Navigate to="/nao-encontrado" replace />
  if (!account || !access) return null
  if (!access.accessible) {
    return (
      <ContentGate
        access={access}
        recommendation={recommendation}
        backTo="/trilhas"
        backLabel="Voltar às trilhas"
      />
    )
  }

  const track = getTrack(lesson.trackId)
  if (!track) return <Navigate to="/nao-encontrado" replace />
  const competency = COMPETENCIES.find((candidate) => candidate.id === lesson.competency)
  const nextLesson = getNextLesson(lesson.id)
  const lessonComplete = Boolean(progress.lessons[lesson.id])
  const linkedLabIds = track.modules
    .filter((candidate) => candidate.lessonIds.includes(lesson.id))
    .flatMap((candidate) => candidate.labIds ?? [])
  const linkedCaseIds = track.modules
    .filter((candidate) => candidate.lessonIds.includes(lesson.id))
    .flatMap((candidate) => candidate.caseIds ?? [])
  const linkedLabs = labs.filter((lab) => linkedLabIds.includes(lab.id))
  const linkedCases = investigationCases.filter((caseDefinition) =>
    linkedCaseIds.includes(caseDefinition.id),
  )
  const lessonIndex = lessons.findIndex((candidate) => candidate.id === lesson.id)
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : undefined

  return (
    <div className="lesson-page">
      <header className="lesson-head">
        <h1 className="text-balance">{lesson.title}</h1>
        <p className="lesson-head__lede">{lesson.summary}</p>
        <div className="lesson-head__meta">
          <MetaItem icon={<Clock size={14} aria-hidden="true" />}>
            {lesson.minutes} min de leitura e prática
          </MetaItem>
          <MetaItem icon={<BookOpen size={14} aria-hidden="true" />}>
            {lesson.exercises.length} exercícios
          </MetaItem>
          <MetaItem icon={<Target size={14} aria-hidden="true" />}>
            {competency?.label ?? lesson.competency}
          </MetaItem>
          <Tag tone={lesson.difficulty === 'avancado' ? 'rust' : 'teal'}>
            {difficultyLabel[lesson.difficulty]}
          </Tag>
          {lessonComplete && (
            <Tag tone="green">
              <CheckCircle2 size={12} aria-hidden="true" /> concluída
            </Tag>
          )}
        </div>
      </header>

      <section className="lesson-outcomes" aria-labelledby="outcomes-title">
        <h2 id="outcomes-title">O que você vai aprender</h2>
        <div className="objectives">
          <ul>
            {lesson.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
        <div className="prerequisites">
          <strong>Pré-requisitos</strong>
          <p>{lesson.prerequisites.join(' · ')}</p>
        </div>
      </section>

      <article className="lesson-article lesson-body">
        <LessonContent blocks={lesson.blocks} />

        <ExercisePlayer
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          competency={lesson.competency}
          exercises={lesson.exercises}
        />

        <section className="takeaways" aria-labelledby="takeaways-title">
          <div className="takeaways__head">
            <h2 id="takeaways-title">O que levar desta unidade</h2>
          </div>
          <ul>
            {lesson.takeaways.map((takeaway) => (
              <li key={takeaway}>
                <span className="takeaways__mark" aria-hidden="true" />
                {takeaway}
              </li>
            ))}
          </ul>
        </section>

        <nav
          className={`lesson-pagination${previousLesson ? '' : ' lesson-pagination--single'}`}
          aria-label="Navegação entre lições"
        >
          {previousLesson ? (
            <Link to={`/licoes/${previousLesson.id}`} className="lesson-page-link lesson-page-link--prev">
              <ArrowLeft size={16} aria-hidden="true" />
              <div>
                <strong>{previousLesson.title}</strong>
                <span className="mono">Lição anterior</span>
              </div>
            </Link>
          ) : null}
          {nextLesson ? (
            <Link to={`/licoes/${nextLesson.id}`} className="lesson-page-link lesson-page-link--next">
              <div>
                <strong>{nextLesson.title}</strong>
                <span className="mono">Próxima lição</span>
              </div>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Link to={`/trilhas/${track.id}`} className="lesson-page-link lesson-page-link--next">
              <div>
                <strong>Visão da trilha</strong>
                <span className="mono">Retomar o percurso</span>
              </div>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </nav>
      </article>

      {(linkedLabs.length > 0 || linkedCases.length > 0) && (
        <section className="lesson-next" aria-labelledby="lesson-next-title">
          <h2 id="lesson-next-title" className="lesson-next__title">
            Aplicar em seguida
          </h2>
          {linkedLabs.map((lab) => (
            <Link to={lab.route} className="aside-practice" key={lab.id}>
              <FlaskConical size={16} aria-hidden="true" />
              <div>
                <strong>{lab.title}</strong>
                <span className="mono">Laboratório</span>
              </div>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ))}
          {linkedCases.map((caseDefinition) => (
            <Link to={`/casos/${caseDefinition.id}`} className="aside-practice" key={caseDefinition.id}>
              <FolderSearch size={16} aria-hidden="true" />
              <div>
                <strong>{caseDefinition.title}</strong>
                <span className="mono">Caso pericial</span>
              </div>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
