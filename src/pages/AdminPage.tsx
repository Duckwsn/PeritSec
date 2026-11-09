import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Database,
  FlaskConical,
  FolderSearch,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import {
  CONTENT_RULES,
  SKILLS_BY_ID,
  levelLabel,
  type ContentType,
} from '../lib/progression'
import { formatDateTime } from '../lib/progress'
import {
  elevateToAdmin,
  fetchAdminOverview,
  updateAccountRole,
  type AdminAccount,
  type AdminOverview,
} from '../lib/admin'
import type { AccountRole } from '../lib/auth'
import { PageHeader, SectionHeading, Tag } from '../components/ui'

const typeLabels: Record<ContentType, string> = {
  lesson: 'Lição',
  lab: 'Laboratório',
  case: 'Caso pericial',
}

const typeTones: Record<ContentType, 'teal' | 'blue' | 'amber'> = {
  lesson: 'teal',
  lab: 'blue',
  case: 'amber',
}

const roleLabels: Record<AccountRole, string> = {
  admin: 'Administrador',
  member: 'Participante',
}

const onboardingLabels: Record<AdminAccount['onboardingStatus'], string> = {
  pending: 'Não iniciado',
  started: 'Em andamento',
  completed: 'Concluído',
}

function count(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function TypeIcon({ type }: { type: ContentType }) {
  if (type === 'lab') return <FlaskConical size={15} aria-hidden="true" />
  if (type === 'case') return <FolderSearch size={15} aria-hidden="true" />
  return <BookOpen size={15} aria-hidden="true" />
}

export function AdminPage() {
  const { account, isAdmin, refresh, expireSession, logout } = useAuth()
  const { progress } = useProgress()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; role: AccountRole } | null>(null)
  const [elevating, setElevating] = useState(false)
  const [elevationError, setElevationError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const result = await fetchAdminOverview()
    if (result.ok) {
      setOverview(result.data)
      setError(null)
    } else {
      setError(result.error)
      if (result.unauthorized) expireSession()
    }
    setLoading(false)
  }, [expireSession])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void fetchAdminOverview().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setOverview(result.data)
        setError(null)
      } else {
        setError(result.error)
        if (result.unauthorized) expireSession()
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [expireSession, isAdmin])

  const catalog = useMemo(
    () => Object.values(CONTENT_RULES).sort((a, b) => a.order - b.order),
    [],
  )

  const backupTotal = overview
    ? overview.accounts.reduce((total, item) => total + item.counts.backups, 0)
    : 0

  async function applyRole(target: AdminAccount, role: AccountRole) {
    setBusyId(target.id)
    setError(null)
    setMessage(null)
    const result = await updateAccountRole(target.id, role)
    if (result.ok) {
      setPending(null)
      setMessage(
        `${target.displayName} agora é ${roleLabels[role].toLowerCase()} nesta instalação.`,
      )
      await load()
      if (target.id === account?.id) await refresh()
    } else {
      setError(result.error)
    }
    setBusyId(null)
  }

  async function becomeAdmin() {
    setElevating(true)
    setElevationError(null)
    const result = await elevateToAdmin()
    if (result.ok) {
      await refresh()
    } else {
      setElevationError(result.error)
      if (result.unauthorized) expireSession()
    }
    setElevating(false)
  }

  async function leaveAndRegister() {
    await logout()
    window.location.assign('/criar-conta')
  }

  if (!isAdmin) {
    return (
      <div className="content-gate">
        <PageHeader
          title="Tornar-se administrador?"
          lede="A área administrativa está disponível para qualquer conta desta instalação. Antes de continuar, confirme se você quer liberar todo o conteúdo desta conta."
          meta={
            <span className="meta-item">
              <ShieldCheck size={14} aria-hidden="true" />
              Conta atual: {account?.displayName ?? 'participante'}
            </span>
          }
        />

        {elevationError && (
          <div className="field-feedback field-feedback--error" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <span>{elevationError}</span>
          </div>
        )}

        <section className="content-gate__panel" aria-labelledby="admin-elevate-title">
          <div className="content-gate__copy">
            <h2 id="admin-elevate-title">O que muda ao se tornar admin</h2>
            <p>
              Sua conta passa a abrir qualquer lição, laboratório e caso, mesmo sem nível ou
              pré-requisitos. O progresso continua sendo registrado, mas deixa de bloquear conteúdo.
              Você também poderá promover ou rebaixar outras contas.
            </p>
            <ul className="gate-requirements">
              <li>Acesso total ao catálogo, incluindo casos avançados.</li>
              <li>Gerenciamento de papéis das contas desta instalação.</li>
              <li>Isolamento de progresso, notas e backups entre perfis mantido.</li>
            </ul>
            <p className="content-gate__safety">
              <ShieldCheck size={15} aria-hidden="true" />
              Se você prefere seguir a jornada guiada por nível, não ative o modo administrativo.
              Para manter as atividades com bloqueios educacionais, saia e crie outra conta.
            </p>
          </div>
          <div className="content-gate__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void becomeAdmin()}
              disabled={elevating}
            >
              {elevating ? 'Liberando acesso…' : 'Tornar-me administrador'}
            </button>
            <Link className="button button--outline" to="/">
              Continuar no modo guiado
            </Link>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => void leaveAndRegister()}
            >
              Sair e criar outra conta
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <PageHeader
        title="Administração local"
        lede="Uma conta administradora pode abrir qualquer lição, laboratório ou caso, mesmo sem os pré-requisitos, e pode alterar o papel das demais contas. O acesso continua restrito ao loopback desta instalação."
        meta={
          <>
            <span className="meta-item">
              <ShieldCheck size={14} aria-hidden="true" />
              Acesso administrativo
            </span>
            <span className="meta-item">SQLite schema v{overview?.schemaVersion ?? 3}</span>
            <span className="meta-item">
              {overview ? `${overview.accountCount} contas · ${overview.adminCount} administrador` : 'Carregando contas…'}
            </span>
          </>
        }
      />

      <div className="admin-notice" role="note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          <strong>Escopo do acesso.</strong> O modo administrativo ignora nível e pré-requisitos
          para abrir conteúdo e gravar progresso na própria conta. Ele não lê, copia nem altera o
          progresso, as notas ou os backups de outras contas: o isolamento entre perfis continua
          valendo.
        </p>
        <Tag tone="teal">local</Tag>
      </div>

      {error && (
        <div className="field-feedback field-feedback--error" role="alert">
          <CircleAlert size={17} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="inline-feedback inline-feedback--ok" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      <div className="progress-summary" aria-label="Resumo administrativo">
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">{overview?.accountCount ?? '—'}</span>
          <span className="progress-summary__label">Contas locais</span>
          <span className="progress-summary__hint">Cada uma com progresso isolado.</span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">{overview?.adminCount ?? '—'}</span>
          <span className="progress-summary__label">Administradores</span>
          <span className="progress-summary__hint">Sempre ao menos um nesta instalação.</span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">{overview?.content.total ?? '—'}</span>
          <span className="progress-summary__label">Conteúdos no catálogo</span>
          <span className="progress-summary__hint">
            {overview
              ? `${count(overview.content.lessons, 'lição', 'lições')} · ${count(overview.content.labs, 'laboratório', 'laboratórios')} · ${count(overview.content.cases, 'caso', 'casos')}`
              : 'Lendo o catálogo compartilhado.'}
          </span>
        </div>
        <div className="progress-summary__item">
          <span className="progress-summary__value mono">{backupTotal}</span>
          <span className="progress-summary__label">Backups locais</span>
          <span className="progress-summary__hint">Arquivos por conta, sem compartilhamento.</span>
        </div>
      </div>

      <section className="page-section" aria-labelledby="admin-accounts-title">
        <SectionHeading
          title="Contas desta instalação"
          description="Papéis são verificados no servidor em cada requisição. Rebaixar a última conta administradora é recusado."
        />

        {loading && !overview && (
          <div className="auth-loading" role="status">
            <span className="auth-loading__mark" aria-hidden="true" />
            <p>Carregando contas locais…</p>
          </div>
        )}

        {overview && (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                Contas locais com papel, nível, progresso e data de criação
              </caption>
              <thead>
                <tr>
                  <th scope="col">Conta</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Nível efetivo</th>
                  <th scope="col">Orientação</th>
                  <th scope="col">Progresso</th>
                  <th scope="col">Criada em</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {overview.accounts.map((item) => {
                  const targetRole: AccountRole = item.role === 'admin' ? 'member' : 'admin'
                  const confirming = pending?.id === item.id && pending.role === targetRole
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="admin-account">
                          <UserRound size={15} aria-hidden="true" />
                          <span>
                            <strong>{item.displayName}</strong>
                            <span className="mono admin-account__username">
                              @{item.username}
                              {item.id === account?.id ? ' · você' : ''}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <Tag tone={item.role === 'admin' ? 'teal' : 'neutral'}>
                          {roleLabels[item.role]}
                        </Tag>
                      </td>
                      <td>
                        {item.effectiveExpertise.label}
                        <span className="admin-table__hint">
                          Partida: {levelLabel(item.expertise)}
                        </span>
                      </td>
                      <td>{onboardingLabels[item.onboardingStatus]}</td>
                      <td>
                        <span className="admin-progress">
                          {item.hasProgress
                            ? `${count(item.counts.lessons, 'lição', 'lições')} · ${count(item.counts.exercises, 'exercício', 'exercícios')}`
                            : 'Sem registros'}
                        </span>
                        <span className="admin-table__hint">
                          {count(item.counts.labs, 'lab', 'labs')} ·{' '}
                          {count(item.counts.cases, 'caso', 'casos')} ·{' '}
                          {count(item.counts.backups, 'backup', 'backups')}
                        </span>
                      </td>
                      <td>{formatDateTime(item.createdAt)}</td>
                      <td>
                        {confirming ? (
                          <span className="admin-role-actions">
                            <button
                              type="button"
                              className="button button--primary button--small"
                              disabled={busyId === item.id}
                              onClick={() => void applyRole(item, targetRole)}
                            >
                              {busyId === item.id ? 'Aplicando…' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              className="button button--quiet button--small"
                              onClick={() => setPending(null)}
                              disabled={busyId === item.id}
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="button button--outline button--small"
                            onClick={() => setPending({ id: item.id, role: targetRole })}
                            disabled={busyId === item.id}
                            aria-label={`${targetRole === 'admin' ? 'Promover' : 'Reverter'} ${item.displayName} para ${roleLabels[targetRole].toLowerCase()}`}
                          >
                            {targetRole === 'admin' ? 'Promover' : 'Reverter'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-section" aria-labelledby="admin-catalog-title">
        <SectionHeading
          title="Catálogo completo"
          description="Todos os conteúdos compartilhados pelo motor de progressão. O acesso administrativo abre qualquer item, mas não marca conclusão sozinho."
        />
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <caption className="sr-only">
              Catálogo de conteúdos com tipo, nível mínimo, pré-requisitos e link de abertura
            </caption>
            <thead>
              <tr>
                <th scope="col">Conteúdo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Nível mínimo</th>
                <th scope="col">Pré-requisitos</th>
                <th scope="col">Abrir</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => {
                const requirements = [
                  ...item.requires.map((id) => CONTENT_RULES[id]?.title ?? id),
                  ...item.requiresSkills.map((id) => SKILLS_BY_ID[id]?.label ?? id),
                ]
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <span className="admin-table__hint mono">{item.id}</span>
                    </td>
                    <td>
                      <Tag tone={typeTones[item.type]}>
                        <TypeIcon type={item.type} />
                        {typeLabels[item.type]}
                      </Tag>
                    </td>
                    <td>{levelLabel(item.minLevel)}</td>
                    <td>
                      {requirements.length > 0 ? (
                        <span className="admin-requirements">{requirements.join(' · ')}</span>
                      ) : (
                        <span className="admin-table__hint">Sem pré-requisitos</span>
                      )}
                    </td>
                    <td>
                      <Link className="text-link" to={item.href}>
                        Acessar
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-aside-grid">
        <div className="aside-panel aside-panel--muted">
          <h2 className="aside-panel__title">
            <Users size={16} aria-hidden="true" />
            Limites do papel
          </h2>
          <p>
            O papel administrativo pertence à instalação local. Ele não cria contas, não redefine
            senhas alheias e não expõe códigos de recuperação. Senhas continuam armazenadas apenas
            como hash scrypt.
          </p>
          <p className="account-aside__note">
            <LockKeyhole size={15} aria-hidden="true" />
            O servidor valida o papel em cada chamada; esconder o link no frontend não seria
            suficiente.
          </p>
        </div>
        <div className="aside-panel">
          <h2 className="aside-panel__title">
            <Database size={16} aria-hidden="true" />
            Dados e auditoria
          </h2>
          <dl className="account-facts">
            <div>
              <dt>Armazenamento</dt>
              <dd>SQLite local · schema v{overview?.schemaVersion ?? 3}</dd>
            </div>
            <div>
              <dt>Contas</dt>
              <dd>{overview?.accountCount ?? '—'} nesta instalação</dd>
            </div>
            <div>
              <dt>Atualizado em</dt>
              <dd>{overview ? formatDateTime(overview.generatedAt) : '—'}</dd>
            </div>
            <div>
              <dt>Progresso próprio</dt>
              <dd>{progress ? 'Carregado nesta sessão' : 'Sem registros'}</dd>
            </div>
          </dl>
          <Link className="button button--outline" to="/conta">
            Abrir configurações da conta
          </Link>
        </div>
      </div>

      {!isAdmin && (
        <p className="field__hint">
          Esta sessão não possui papel administrativo. A página permanece visível apenas como
          registro histórico até a próxima navegação.
        </p>
      )}
    </div>
  )
}
