import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FlaskConical,
  FolderSearch,
  Lock,
  Network,
  ShieldCheck,
  Terminal,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { labs } from '../data/courses'
import { LAB_SCENARIOS } from '../lib/network'
import { investigationCases } from '../data/cases'
import { accessForContent, effectiveLevel, levelLabel } from '../lib/progression'
import { PageHeader, SectionHeading, Tag } from '../components/ui'

const labIcons = {
  'lab-redes': Network,
  'lab-trafego': ShieldCheck,
  'lab-cripto': Lock,
}

export function LabsPage() {
  const { account, isAdmin } = useAuth()
  const { progress } = useProgress()
  if (!account) return null
  const caseDefinition = investigationCases[0]
  const networkCompleted = Object.keys(progress.labs).filter((id) =>
    id.startsWith('lab-redes:'),
  ).length
  const completedLabs = labs.filter(
    (lab) => accessForContent(lab.id, account.expertise, progress, { admin: isAdmin }).completed,
  ).length
  const level = effectiveLevel(account.expertise, progress)
  const caseAccess = accessForContent(caseDefinition.id, account.expertise, progress, {
    admin: isAdmin,
  })

  return (
    <div>
      <PageHeader
        title="Laboratórios de redes, tráfego e criptografia."
        lede="Topologia, terminal, captura e transformações criptográficas calculadas. Cada resultado deriva das suas ações e das regras do cenário — nada é executado contra redes ou sistemas reais."
        meta={
          <>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">{labs.length} laboratórios operacionais</span>
            <span className="meta-item">{LAB_SCENARIOS.length} cenários de rede</span>
            <span className="meta-item">{completedLabs}/{labs.length} laboratórios concluídos</span>
          </>
        }
      />

      <div className="simulation-banner" role="note">
        <Terminal size={18} aria-hidden="true" />
        <p>
          <strong>Ambiente isolado.</strong> Os comandos são interpretados por um simulador
          determinístico. Nenhuma saída é produzida pelo sistema operacional do seu computador.
        </p>
        <Tag tone="dark">simulado</Tag>
      </div>

      <section className="page-section">
        <div className="lab-list">
          {labs.map((lab, index) => {
            const Icon = labIcons[lab.id as keyof typeof labIcons] ?? FlaskConical
            const access = accessForContent(lab.id, account.expertise, progress, {
              admin: isAdmin,
            })
            const done = access.completed
            const locked = !access.allowed && !access.historical
            const labProgress =
              lab.id === 'lab-redes'
                ? `${networkCompleted}/${LAB_SCENARIOS.length} cenários`
                : progress.labs[lab.id]
                  ? 'concluído'
                  : 'não iniciado'
            return (
              <article className={`lab-row ${locked ? 'lab-row--locked' : ''}`} key={lab.id}>
                <div className="lab-row__index">
                  <span className="mono">LAB {String(index + 1).padStart(2, '0')}</span>
                  <Icon size={30} aria-hidden="true" />
                </div>
                <div className="lab-row__copy">
                  <div className="lab-row__top">
                    <Tag tone="neutral">{lab.difficulty}</Tag>
                    {locked ? (
                      <Tag tone="rust">
                        <Lock size={12} aria-hidden="true" /> bloqueado
                      </Tag>
                    ) : (
                      <Tag tone={done ? 'green' : access.inProgress ? 'amber' : 'teal'}>
                        {done ? (
                          <>
                            <CheckCircle2 size={12} aria-hidden="true" /> concluído
                          </>
                        ) : access.inProgress ? (
                          'em andamento'
                        ) : (
                          labProgress
                        )}
                      </Tag>
                    )}
                  </div>
                  <h2>{lab.title}</h2>
                  <p className="lab-row__subtitle">{lab.subtitle}</p>
                  <p>{lab.description}</p>
                  <div className="lab-row__outcomes">
                    {lab.outcomes.map((outcome) => (
                      <span key={outcome}>
                        <span className="outcome-dot" aria-hidden="true" />
                        {outcome}
                      </span>
                    ))}
                  </div>
                  {locked && (
                    <p className="lab-row__lock">
                      <Lock size={14} aria-hidden="true" />
                      {access.reason === 'nivel'
                        ? `Disponível a partir do nível ${levelLabel(access.minLevel)}.`
                        : `Pré-requisitos pendentes: ${access.missingContent
                            .map((item) => item.title)
                            .join(', ')}${access.missingSkills.length ? `; competências: ${access.missingSkills.map((item) => item.label).join(', ')}` : ''}.`}
                    </p>
                  )}
                </div>
                <div className="lab-row__action">
                  <span className="mono">{lab.minutes} min</span>
                  <Link
                    className={`button ${locked ? 'button--outline' : 'button--primary'}`}
                    to={lab.route}
                  >
                    {locked
                      ? 'Ver requisitos'
                      : lab.id === 'lab-redes' && networkCompleted > 0 && !done
                        ? 'Continuar cenários'
                        : done
                          ? 'Reabrir laboratório'
                          : 'Abrir laboratório'}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="page-section">
        <SectionHeading
          title="O que cada ambiente verifica"
          description="A conclusão é registrada quando o objetivo técnico é demonstrado, não quando a página é aberta."
        />
        <div className="lab-explain-grid">
          <div>
            <Cpu size={22} aria-hidden="true" />
            <h3>Motor determinístico</h3>
            <p>
              A configuração da topologia afeta saídas, resolução DNS, rotas e eventos. As mesmas
              condições produzem os mesmos resultados.
            </p>
          </div>
          <div>
            <Network size={22} aria-hidden="true" />
            <h3>Correlação, não adivinhação</h3>
            <p>
              O laboratório de tráfego exige filtros e leitura de campos. O caso cruza DHCP, DNS,
              firewall, servidor e captura.
            </p>
          </div>
          <div>
            <Terminal size={22} aria-hidden="true" />
            <h3>Limites explícitos</h3>
            <p>
              Não há integração com Packet Tracer, Wireshark ou GNS3 nesta versão. Importação de
              arquivos externos ainda não está implementada.
            </p>
          </div>
        </div>
      </section>

      <section className="lab-case-cta">
        <div>
          <h2>Aplique o método a um caso completo.</h2>
          <p>
            Oito fontes de evidência, hipóteses concorrentes, linha do tempo com fusos diferentes e
            relatório avaliado por rubrica.
          </p>
          {!caseAccess.allowed && !caseAccess.historical && (
            <p className="lab-case-cta__lock">
              <Lock size={14} aria-hidden="true" />
              O caso exige nível {levelLabel(caseAccess.minLevel)} e competências de rede, logs,
              custódia e método. O acesso não é liberado apenas pela escolha do nível.
            </p>
          )}
        </div>
        <Link className="button button--outline" to={`/casos/${caseDefinition.id}`}>
          <FolderSearch size={18} aria-hidden="true" />
          {caseAccess.allowed || caseAccess.historical
            ? `Abrir ${caseDefinition.code}`
            : 'Ver requisitos do caso'}
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <div className="page-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>
          Todos os laboratórios usam dados sintéticos e personagens fictícios. Não há capturas reais
          de terceiros, credenciais reais ou comunicação externa nesta versão.
        </p>
      </div>
    </div>
  )
}
