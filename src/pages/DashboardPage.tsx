import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, FlaskConical, FolderSearch, LockKeyhole } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { getLesson, getTrackLessons, labs, tracks } from '../data/courses'
import { investigationCases } from '../data/cases'
import { getCaseProgress } from '../lib/progress'
import {
  accessForContent,
  accessForTrack,
  contentInfo,
  effectiveLevel,
  hasEvidence,
  nextActivity,
  trackLevelLabel,
} from '../lib/progression'

const trackPurpose: Record<string, string> = {
  redes: 'Como os dados viajam, como endereçar redes e como ler os comandos que mostram o caminho.',
  administracao: 'Um método para diagnosticar falhas sem trocar tudo de uma vez.',
  seguranca: 'Ler logs e tráfego, reconhecer anomalias e separar correlação de conclusão.',
  pericia: 'Preservar integridade, correlacionar fontes e comunicar conclusões com limites explícitos.',
  criptografia: 'Diferenciar codificação, hash e cifra; calcular transformações e reconhecer limites.',
}

export function DashboardPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  if (!account) return null

  const hasHistory = hasEvidence(progress)
  const level = effectiveLevel(account.expertise, progress)
  const recommendation = nextActivity(account.expertise, progress, { admin: isAdmin })
  const nextLesson =
    recommendation?.type === 'lesson' ? getLesson(recommendation.id) : undefined
  const nextTrack = nextLesson
    ? tracks.find((track) => track.id === nextLesson.trackId)
    : undefined

  const caseDefinition = investigationCases[0]
  const caseProgress = getCaseProgress(progress, caseDefinition.id)
  const caseStarted =
    caseProgress.evidenceOpened.length > 0 || caseProgress.actions.length > 0
  const caseSubmitted = Boolean(caseProgress.submitted?.passed)
  const caseAccess = accessForContent(caseDefinition.id, account.expertise, progress, {
    admin: isAdmin,
  })

  const networkScenarios = Object.keys(progress.labs).filter((id) =>
    id.startsWith('lab-redes:'),
  ).length
  const labsStarted =
    networkScenarios > 0 ||
    Boolean(progress.labs['lab-trafego']) ||
    Boolean(progress.labs['lab-cripto'])

  const primaryAction = recommendation?.href
    ? {
        to: recommendation.href,
        label:
          recommendation.recommendation === 'retomar'
            ? 'Retomar atividade'
            : hasHistory
              ? 'Continuar jornada'
              : 'Começar primeira atividade',
      }
    : { to: '/trilhas', label: 'Revisar a jornada completa' }

  return (
    <div className="home">
      <section className="home-intro" aria-labelledby="home-title">
        <h1 id="home-title" className="text-balance">
          Aprenda redes, investigue com método e sustente conclusões.
        </h1>
        <p className="home-intro__lede">
          Olá, {account.displayName}. Seu ponto de partida é{' '}
          <strong>{level.label.toLowerCase()}</strong>. O PeritSec combina explicação curta, prática
          verificável e progressão por competências — sem tirar conclusões por você. Tudo funciona no
          seu computador, com dados sintéticos e nenhuma ação sobre redes reais.
        </p>
        <div className="home-intro__actions">
          <Link className="button button--primary" to={primaryAction.to}>
            {primaryAction.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="button button--outline" to="/trilhas">
            Ver as trilhas de aprendizagem
          </Link>
        </div>
      </section>

      <section className="home-continue" aria-labelledby="continue-title">
        <h2 id="continue-title" className="home-section-title">
          {hasHistory ? 'Continue de onde parou' : 'Por onde começar'}
        </h2>

        {recommendation ? (
          <div className="home-next">
            <span className="home-next__kind mono">
              {recommendation.recommendation === 'retomar'
                ? 'ATIVIDADE EM ANDAMENTO'
                : recommendation.recommendation === 'revisar'
                  ? 'PARA REVISAR'
                  : 'PRÓXIMA ATIVIDADE RECOMENDADA'}
            </span>
            <div className="home-next__body">
              <h3>{recommendation.title}</h3>
              <p>
                {recommendation.type === 'case' && recommendation.inProgress
                  ? `Você já abriu ${caseProgress.evidenceOpened.length} de ${caseDefinition.evidence.length} evidências. Retome o exame, teste as hipóteses e submeta o relatório quando os dados sustentarem uma conclusão.`
                  : recommendation.type === 'lab'
                    ? 'Este laboratório faz parte da sua próxima etapa. O avanço é registrado quando o objetivo técnico é verificado, não apenas quando a página abre.'
                    : contentInfo(recommendation.id)?.summary ??
                      'A recomendação usa o nível efetivo e os pré-requisitos reais do seu progresso.'}
              </p>
              <div className="home-next__actions">
                <Link className="text-link" to={recommendation.href ?? '#'}>
                  {recommendation.recommendation === 'retomar'
                    ? 'Retomar atividade'
                    : 'Abrir atividade'}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
                {nextTrack && (
                  <Link className="text-link" to={`/trilhas/${nextTrack.id}`}>
                    Ver trilha {nextTrack.code} · {nextTrack.title}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="home-next home-next--complete">
            <div className="home-next__body">
              <h3>Não há uma próxima atividade desbloqueada.</h3>
              <p>
                Revise o que já foi concluído, consulte seus relatórios ou verifique as competências
                demonstradas no seu progresso.
              </p>
              <div className="home-next__actions">
                <Link className="text-link" to="/progresso">
                  Ver meu progresso <ChevronRight size={14} aria-hidden="true" />
                </Link>
                <Link className="text-link" to="/trilhas">
                  Revisar trilhas <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {!hasHistory && (
          <p className="home-guidance">
            A recomendação inicial respeita o nível escolhido no cadastro. Laboratórios e casos só
            aparecem como próximos passos quando os pré-requisitos correspondentes já foram
            demonstrados.
          </p>
        )}
      </section>

      <section className="home-path" aria-labelledby="path-title">
        <h2 id="path-title" className="home-section-title">
          O caminho completo
        </h2>
        <p className="home-section-lede">
          Cinco etapas conectadas. O nível inicial orienta a entrada; cada etapa seguinte depende das
          competências e dos pré-requisitos que você demonstrar.
        </p>
        <ol className="path-list">
          {tracks.map((track) => {
            const trackLessons = getTrackLessons(track)
            const completed = trackLessons.filter((lesson) => progress.lessons[lesson.id]).length
            const trackAccess = accessForTrack(track.id, account.expertise, progress, {
              admin: isAdmin,
            })
            return (
              <li className="path-list__item" key={track.id}>
                <span className="path-list__step mono" aria-hidden="true">
                  {track.code}
                </span>
                <div className="path-list__copy">
                  <h3>
                    <Link to={`/trilhas/${track.id}`}>{track.title}</Link>
                  </h3>
                  <p>{trackPurpose[track.id] ?? track.tagline}</p>
                  <span className="path-list__meta mono">
                    {trackLessons.length} lições · {completed}/{trackLessons.length} concluídas
                  </span>
                  {!trackAccess.allowed && (
                    <span className="path-list__lock">
                      <LockKeyhole size={13} aria-hidden="true" />
                      A partir do nível {trackLevelLabel(track.id)}
                    </span>
                  )}
                </div>
                <Link
                  className="path-list__action"
                  to={`/trilhas/${track.id}`}
                  aria-label={`Abrir trilha ${track.title}`}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="home-practice" aria-labelledby="practice-title">
        <h2 id="practice-title" className="home-section-title">
          Pratique em ambientes sintéticos
        </h2>
        <div className="home-practice__grid">
          <article className="practice-card">
            <FlaskConical size={20} aria-hidden="true" />
            <h3>Laboratórios</h3>
            <p>
              {labs.length} ambientes operacionais: simulador de rede com terminal didático, análise
              de captura de tráfego e laboratório criptográfico. Nenhum comando chega à sua máquina.
            </p>
            <Link className="text-link" to="/laboratorios">
              {labsStarted ? 'Voltar aos laboratórios' : 'Conhecer os laboratórios'}{' '}
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </article>
          <article className="practice-card">
            <FolderSearch size={20} aria-hidden="true" />
            <h3>Casos periciais</h3>
            <p>
              Investigações completas com escopo, evidências, hipóteses, linha do tempo e relatório
              avaliado por rubrica. Nem toda fonte disponível sustenta uma acusação — e isso faz parte
              do exercício.
            </p>
            {!caseAccess.allowed && !caseAccess.historical && (
              <p className="practice-card__lock">
                <LockKeyhole size={13} aria-hidden="true" />
                Requer nível avançado e pré-requisitos de rede, logs e custódia.
              </p>
            )}
            <Link className="text-link" to={`/casos/${caseDefinition.id}`}>
              {caseSubmitted
                ? 'Revisar o caso concluído'
                : caseStarted
                  ? 'Retomar o caso em análise'
                  : caseAccess.allowed
                    ? 'Abrir o primeiro caso'
                    : 'Conhecer o caso e os requisitos'}{' '}
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>
    </div>
  )
}
