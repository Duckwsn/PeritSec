import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Database,
  KeyRound,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { EXPERTISE_LEVELS, effectiveLevel, type ExpertiseId } from '../lib/progression'
import { formatDateTime } from '../lib/progress'
import { PageHeader, SectionHeading, Tag } from '../components/ui'

export function AccountPage() {
  const {
    account,
    isAdmin,
    session,
    setup,
    updateProfile,
    logout,
    regenerateRecoveryCode,
    importAnonymousProgress,
  } = useAuth()
  const { progress, reload } = useProgress()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(account?.displayName ?? '')
  const [expertise, setExpertise] = useState<ExpertiseId>(account?.expertise ?? 'iniciante')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  if (!account) return null
  const level = effectiveLevel(account.expertise, progress)
  const lessonsCompleted = Object.keys(progress.lessons).length
  const labsCompleted = Object.keys(progress.labs).length
  const casesStarted = Object.keys(progress.cases).length

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileBusy(true)
    setProfileMessage(null)
    setProfileError(null)
    const result = await updateProfile({ displayName, expertise })
    setProfileBusy(false)
    if (!result.ok) {
      setProfileError(result.error)
      return
    }
    setProfileMessage('Dados da conta atualizados. Seu progresso, relatórios e anotações foram preservados.')
  }

  async function handleRecovery() {
    setRecoveryBusy(true)
    setRecoveryCode(null)
    setRecoveryNotice(null)
    setRecoveryError(null)
    const result = await regenerateRecoveryCode()
    setRecoveryBusy(false)
    if (!result.ok) {
      setRecoveryError(result.error)
      return
    }
    setRecoveryCode(result.data.recoveryCode)
    setRecoveryNotice(result.data.notice)
  }

  async function handleImport() {
    setImportBusy(true)
    setImportMessage(null)
    setImportError(null)
    const result = await importAnonymousProgress()
    if (!result.ok) {
      setImportBusy(false)
      setImportError(result.error)
      return
    }
    await reload()
    setImportBusy(false)
    setImportMessage(
      'Progresso anterior importado para esta conta. Outras contas não recebem esses dados.',
    )
  }

  async function handleLogout() {
    setLogoutBusy(true)
    await logout()
    navigate('/entrar', { replace: true })
  }

  return (
    <div className="account-page">
      <PageHeader
        title="Sua conta local."
        lede="O nível orienta o ponto de partida; as competências demonstradas determinam o avanço. Alterar o nível não apaga progresso, relatórios ou anotações."
        meta={
          <>
            <span className="meta-item">Usuário: {account.username}</span>
            <span className="meta-item">
              Ponto de partida selecionado:{' '}
              {EXPERTISE_LEVELS.find((item) => item.id === account.expertise)?.label ??
                account.expertise}
            </span>
            <span className="meta-item">Nível efetivo: {level.label}</span>
            <span className="meta-item">Conta criada em {formatDateTime(account.createdAt)}</span>
          </>
        }
        actions={
          <button
            type="button"
            className="button button--outline"
            onClick={() => void handleLogout()}
            disabled={logoutBusy}
          >
            <LogOut size={16} aria-hidden="true" />
            {logoutBusy ? 'Saindo…' : 'Sair desta conta'}
          </button>
        }
      />

      <div className="account-layout">
        <div className="account-main">
          <section className="page-section" aria-labelledby="account-profile-title">
            <SectionHeading
              title="Perfil e ponto de partida"
              description="O nome de usuário identifica a conta nesta instalação e não pode ser alterado. O nome de exibição pode ser atualizado."
            />
            <form className="account-form" onSubmit={handleProfile} noValidate>
              {profileMessage && (
                <div className="inline-feedback inline-feedback--ok" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{profileMessage}</span>
                </div>
              )}
              {profileError && (
                <div className="field-feedback field-feedback--error" role="alert">
                  <CircleAlert size={17} aria-hidden="true" />
                  <span>{profileError}</span>
                </div>
              )}
              <div className="field-row">
                <label className="field">
                  <span>Nome de exibição</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="field">
                  <span>Nome de usuário</span>
                  <input type="text" value={account.username} disabled />
                </label>
              </div>

              <fieldset className="expertise-fieldset">
                <legend>Nível de expertise</legend>
                <p className="field__hint">
                  O nível inicial define a recomendação e o catálogo de partida. O avanço continua
                  dependendo das competências demonstradas e dos pré-requisitos de cada conteúdo.
                </p>
                <div className="expertise-options">
                  {EXPERTISE_LEVELS.map((level) => (
                    <label
                      className={`expertise-option ${expertise === level.id ? 'is-selected' : ''}`}
                      key={level.id}
                    >
                      <input
                        type="radio"
                        name="account-expertise"
                        value={level.id}
                        checked={expertise === level.id}
                        onChange={() => setExpertise(level.id)}
                      />
                      <span className="expertise-option__copy">
                        <strong>{level.label}</strong>
                        <span>{level.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="button-row">
                <button className="button button--primary" type="submit" disabled={profileBusy}>
                  {profileBusy ? 'Salvando…' : 'Salvar alterações'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <Link className="button button--quiet" to="/progresso">
                  Ver progresso e backups
                </Link>
              </div>
            </form>
          </section>

          <section className="page-section" aria-labelledby="account-recovery-title">
            <SectionHeading
              title="Recuperação de acesso"
              description="Sem e-mail, a redefinição usa um código local. Gerar um novo código invalida o anterior."
            />
            {recoveryCode && (
              <div className="account-recovery" role="status">
                <KeyRound size={20} aria-hidden="true" />
                <div>
                  <strong>Novo código de recuperação</strong>
                  <div className="recovery-code">
                    <code>{recoveryCode}</code>
                  </div>
                  <p>{recoveryNotice}</p>
                </div>
              </div>
            )}
            {recoveryError && (
              <div className="field-feedback field-feedback--error" role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <span>{recoveryError}</span>
              </div>
            )}
            <button
              type="button"
              className="button button--outline"
              onClick={() => void handleRecovery()}
              disabled={recoveryBusy}
            >
              <KeyRound size={16} aria-hidden="true" />
              {recoveryBusy ? 'Gerando…' : 'Gerar novo código de recuperação'}
            </button>
            <p className="field__hint">
              O código é exibido uma vez. Guarde-o fora do aplicativo. Ele não é enviado por e-mail
              nem armazenado em texto puro.
            </p>
          </section>

          {setup?.hasAnonymousProgress && (
            <section className="page-section" aria-labelledby="account-import-title">
              <SectionHeading
                title="Progresso anterior"
                description="Existe um progresso criado antes das contas locais. Ele pode ser associado a uma única conta."
              />
              {importMessage && (
                <div className="inline-feedback inline-feedback--ok" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{importMessage}</span>
                </div>
              )}
              {importError && (
                <div className="field-feedback field-feedback--error" role="alert">
                  <CircleAlert size={17} aria-hidden="true" />
                  <span>{importError}</span>
                </div>
              )}
              <button
                type="button"
                className="button button--outline"
                onClick={() => void handleImport()}
                disabled={importBusy}
              >
                <Database size={16} aria-hidden="true" />
                {importBusy ? 'Importando…' : 'Importar progresso anterior para esta conta'}
              </button>
              <p className="field__hint">
                A importação não sobrescreve o progresso atual desta conta e não compartilha os dados
                com outras contas.
              </p>
            </section>
          )}
        </div>

        <aside className="account-aside">
          <div className="aside-panel">
            <h2 className="aside-panel__title">Sessão e privacidade</h2>
            <dl className="account-facts">
              <div>
                <dt>Sessão</dt>
                <dd>{session?.policy.label ?? '30 dias a partir do login'}</dd>
              </div>
              <div>
                <dt>Expira em</dt>
                <dd>{session?.expiresAt ? formatDateTime(session.expiresAt) : '—'}</dd>
              </div>
              <div>
                <dt>Armazenamento</dt>
                <dd>SQLite local · dados separados por conta</dd>
              </div>
              <div>
                <dt>Nível efetivo</dt>
                <dd>{level.label}</dd>
              </div>
              <div>
                <dt>Papel nesta instalação</dt>
                <dd>{isAdmin ? 'Administrador local' : 'Participante'}</dd>
              </div>
            </dl>
            <p className="account-aside__note">
              <ShieldCheck size={15} aria-hidden="true" />
              As contas e os dados pertencem a esta instalação. Não há sincronização entre
              computadores nem promessa de isolamento contra alguém com controle administrativo do
              Windows.
            </p>
          </div>
          <div className="aside-panel admin-entry">
            <h2 className="aside-panel__title">
              <ShieldCheck size={16} aria-hidden="true" />
              Administração
            </h2>
            <p>
              {isAdmin
                ? 'Esta conta administra a instalação. A área administrativa lista as contas, permite alterar papéis e abre qualquer conteúdo sem exigir nível ou pré-requisitos.'
                : 'A área administrativa está disponível para esta conta. Ao entrar, você pode confirmar a ativação do acesso total e liberar qualquer conteúdo sem nível ou pré-requisitos.'}
            </p>
            <Link className="button button--outline" to="/admin">
              {isAdmin ? 'Abrir área administrativa' : 'Abrir /admin e decidir'}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="aside-panel aside-panel--muted">
            <h2 className="aside-panel__title">Dados desta conta</h2>
            <p>
              O nível efetivo atual é <strong>{level.label}</strong>. Ele considera o ponto de
              partida e as competências demonstradas, sem apagar o histórico ao mudar a seleção.
            </p>
            <div className="account-tags">
              <Tag tone="teal">{lessonsCompleted} lições</Tag>
              <Tag tone="blue">{labsCompleted} registros de laboratório</Tag>
              <Tag tone="amber">{casesStarted} casos iniciados</Tag>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
