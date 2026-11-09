import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Clock, FlaskConical, FolderSearch, LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getTrackLessons, labs, tracks } from '../data/courses'
import { investigationCases } from '../data/cases'
import { COMPETENCIES, competencyLevel, competencyPoints } from '../lib/progress'
import { accessForTrack, effectiveLevel, trackLevelLabel } from '../lib/progression'
import { PageHeader, ProgressBar, SectionHeading, Tag } from '../components/ui'

export function TracksPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  if (!account) return null
  const completedLessons = Object.keys(progress.lessons).length
  const level = effectiveLevel(account.expertise, progress)

  return (
    <div>
      <PageHeader
        title="Cinco trilhas, uma linha de investigação."
        lede="Os fundamentos sustentam o diagnóstico; o diagnóstico produz evidências; a perícia exige método. O nível inicial orienta a entrada de cada trilha, mas nenhum caso avançado é liberado apenas pela escolha do nível."
        meta={
          <>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">{completedLessons} lições concluídas</span>
            <span className="meta-item">{labs.length} laboratórios operacionais</span>
            <span className="meta-item">{investigationCases.length} caso completo</span>
          </>
        }
        actions={
          <Link className="button button--outline" to="/progresso">
            Ver meu progresso <ArrowRight size={15} />
          </Link>
        }
      />

      <section className="page-section">
        <div className="track-cards">
          {tracks.map((track) => {
            const trackLessons = getTrackLessons(track)
            const completed = trackLessons.filter((lesson) => progress.lessons[lesson.id]).length
            const percent = trackLessons.length ? Math.round((completed / trackLessons.length) * 100) : 0
            const linkedLabs = labs.filter((lab) => track.modules.some((module) => module.labIds?.includes(lab.id)))
            const linkedCases = investigationCases.filter((caseDefinition) =>
              track.modules.some((module) => module.caseIds?.includes(caseDefinition.id)),
            )
            const trackAccess = accessForTrack(track.id, account.expertise, progress, {
              admin: isAdmin,
            })
            const trackComplete = completed === trackLessons.length && trackLessons.length > 0
            const trackStarted = completed > 0
            return (
              <article
                className={`track-card ${trackAccess.allowed ? '' : 'track-card--locked'}`}
                key={track.id}
              >
                <div className="track-card__header">
                  <span className="track-card__code mono">TRILHA {track.code}</span>
                  {!trackAccess.allowed ? (
                    <Tag tone="rust">
                      <LockKeyhole size={12} aria-hidden="true" /> A partir de {trackLevelLabel(track.id)}
                    </Tag>
                  ) : trackComplete ? (
                    <Tag tone="green">Concluída</Tag>
                  ) : trackStarted ? (
                    <Tag tone="amber">Em andamento</Tag>
                  ) : (
                    <Tag tone="teal">Disponível</Tag>
                  )}
                </div>
                <div className="track-card__main">
                  <div className="track-card__copy">
                    <h2>
                      <Link to={`/trilhas/${track.id}`}>{track.title}</Link>
                    </h2>
                    <p className="track-card__tagline">{track.tagline}</p>
                    <p>{track.description}</p>
                    <div className="tag-row">
                      {track.competency.map((competencyId) => {
                        const competency = COMPETENCIES.find((item) => item.id === competencyId)
                        return competency ? (
                          <Tag key={competencyId} tone="neutral">
                            {competency.short}
                          </Tag>
                        ) : null
                      })}
                      {linkedCases.length > 0 && <Tag tone="amber">caso aplicado</Tag>}
                    </div>
                  </div>
                  <div className="track-card__side">
                    <span className="label">Domínio registrado</span>
                    <div className="track-card__levels">
                      {track.competency.map((competencyId) => {
                        const competency = COMPETENCIES.find((item) => item.id === competencyId)
                        if (!competency) return null
                        const points = competencyPoints(progress, competencyId)
                        return (
                          <div key={competencyId} className="mini-level">
                            <div>
                              <span>{competency.short}</span>
                              <span className="mono">{points}</span>
                            </div>
                            <div className="mini-level__bar">
                              <span style={{ width: `${points}%` }} />
                            </div>
                            <small>{competencyLevel(points).label}</small>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="track-card__modules">
                  {track.modules.map((module) => (
                    <div className="module-chip" key={module.id}>
                      <span className={`module-chip__status module-chip__status--${module.status}`} aria-hidden="true" />
                      <div>
                        <strong>{module.title}</strong>
                        <span>
                          {module.status === 'disponivel'
                            ? `${module.lessonIds.length} lição${module.lessonIds.length === 1 ? '' : 'ões'}`
                            : 'em expansão'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="track-card__foot">
                  <ProgressBar value={percent} label={`${completed}/${trackLessons.length} lições concluídas`} compact />
                  <div className="track-card__links">
                    {linkedLabs.map((lab) => (
                      <Link key={lab.id} to={lab.route} className="inline-icon-link">
                        <FlaskConical size={14} /> Laboratório
                      </Link>
                    ))}
                    {linkedCases.map((caseDefinition) => (
                      <Link key={caseDefinition.id} to={`/casos/${caseDefinition.id}`} className="inline-icon-link">
                        <FolderSearch size={14} /> Caso
                      </Link>
                    ))}
                    <Link className="text-link" to={`/trilhas/${track.id}`}>
                      {trackAccess.allowed ? 'Abrir trilha' : 'Ver trilha e requisitos'}{' '}
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="page-section">
        <SectionHeading
          title="O que significa progredir aqui"
          description="A conclusão de uma lição exige resolver os exercícios. Laboratórios contam apenas quando o objetivo técnico é verificado. O caso exige relatório avaliado por rubrica."
        />
        <div className="method-strip">
          <div>
            <h3>Conhecimento aplicado</h3>
            <p>Exercícios variam cenário, dados e raciocínio — não apenas números.</p>
          </div>
          <div>
            <h3>Diagnóstico verificável</h3>
            <p>As saídas do simulador derivam da configuração e dos testes executados.</p>
          </div>
          <div>
            <h3>Conclusão calibrada</h3>
            <p>O caso pontua causa, evidências, hipóteses, linha do tempo e limites.</p>
          </div>
          <div>
            <h3>Registro local por conta</h3>
            <p>
              O histórico permanece neste dispositivo, em SQLite local, separado por conta, e pode ser
              copiado na página de progresso.
            </p>
          </div>
        </div>
      </section>

      <div className="page-note">
        <Clock size={16} aria-hidden="true" />
        <p>
          O nível inicial não substitui pré-requisitos. Quando uma trilha aparece bloqueada, a página
          dela explica o nível exigido e a próxima atividade que ajuda a demonstrar as competências
          necessárias, sem antecipar conclusões ou gabaritos.
        </p>
      </div>
    </div>
  )
}
