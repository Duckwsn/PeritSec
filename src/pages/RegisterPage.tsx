import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, Database, ShieldCheck } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'
import { EXPERTISE_LEVELS, type ExpertiseId } from '../lib/progression'

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export function RegisterPage() {
  const { account, setup, loading, backendError, register, recoveryReceipt } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [expertise, setExpertise] = useState<ExpertiseId | ''>('')
  const [migrate, setMigrate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [field, setField] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (account) {
    const showRegistrationReceipt = Boolean(recoveryReceipt)
    return (
      <Navigate
        to={account.onboardingStatus === 'pending' || showRegistrationReceipt ? '/comecar' : '/'}
        replace
      />
    )
  }

  if (loading) {
    return (
      <AuthShell>
        <div className="auth-loading" role="status">
          <span className="auth-loading__mark" aria-hidden="true" />
          <p>Verificando a instalação local…</p>
        </div>
      </AuthShell>
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setField(null)
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedName = displayName.trim().replace(/\s+/g, ' ')
    if (normalizedName.length < 2) {
      setError('Informe um nome de exibição com pelo menos 2 caracteres.')
      setField('displayName')
      return
    }
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setError('Use de 3 a 32 caracteres no usuário: letras sem acento, números, ponto, hífen ou sublinhado.')
      setField('username')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      setField('password')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      setField('confirmPassword')
      return
    }
    if (!expertise) {
      setError('Selecione o nível que melhor descreve seu ponto de partida.')
      setField('expertise')
      return
    }

    setBusy(true)
    const result = await register({
      displayName: normalizedName,
      username: normalizedUsername,
      password,
      confirmPassword,
      expertise,
      migrateAnonymousProgress: migrate,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      setField(result.field ?? null)
      return
    }
    navigate('/comecar', { replace: true })
  }

  return (
    <AuthShell>
      <div className="auth-page auth-page--register">
        <div className="auth-page__copy">
          <h1 className="text-balance">Crie uma conta local para aprender com continuidade.</h1>
          <p className="auth-page__lede">
            Cada conta mantém seu próprio nível, progresso, competências, laboratórios e relatórios.
            Você pode criar mais de uma conta no mesmo computador e alternar entre elas sem misturar
            históricos.
          </p>
          <div className="auth-page__note">
            <Database size={18} aria-hidden="true" />
            <p>
              Tudo é gravado no SQLite desta instalação. Não há e-mail, telefone, OAuth ou envio de
              dados para serviços externos.
            </p>
          </div>
          <div className="auth-page__note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              A senha é armazenada apenas como hash <code>scrypt</code> com salt. Ela não aparece em
              logs, respostas da API ou no banco em texto puro.
            </p>
          </div>
        </div>

        <div className="auth-page__panel auth-page__panel--wide">
          <h2>Criar conta</h2>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {backendError && (
              <div className="field-feedback field-feedback--error" role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <span>{backendError}</span>
              </div>
            )}
            {error && (
              <div className="field-feedback field-feedback--error" role="alert">
                <CircleAlert size={17} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <label className="field" data-invalid={field === 'displayName' || undefined}>
              <span>Nome de exibição</span>
              <input
                type="text"
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={field === 'displayName'}
                required
              />
              <span className="field__hint">É o nome que aparecerá na página inicial e na sua conta.</span>
            </label>

            <label className="field" data-invalid={field === 'username' || undefined}>
              <span>Nome de usuário</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={field === 'username'}
                required
              />
              <span className="field__hint">
                Único nesta instalação. Letras sem acento, números, ponto, hífen ou sublinhado.
              </span>
            </label>

            <div className="field-row">
              <label className="field" data-invalid={field === 'password' || undefined}>
                <span>Senha</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={field === 'password'}
                  required
                />
                <span className="field__hint">Mínimo de 8 caracteres.</span>
              </label>
              <label className="field" data-invalid={field === 'confirmPassword' || undefined}>
                <span>Confirmar senha</span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={field === 'confirmPassword'}
                  required
                />
              </label>
            </div>

            <fieldset className="expertise-fieldset" aria-describedby="expertise-guidance">
              <legend>Seu ponto de partida</legend>
              <p id="expertise-guidance" className="field__hint">
                O nível define a primeira recomendação e o catálogo inicial. Ele não libera casos
                avançados sozinho: o acesso também depende das competências e dos pré-requisitos de
                cada investigação.
              </p>
              <div className="expertise-options">
                {EXPERTISE_LEVELS.map((level) => (
                  <label
                    className={`expertise-option ${expertise === level.id ? 'is-selected' : ''}`}
                    key={level.id}
                  >
                    <input
                      type="radio"
                      name="expertise"
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

            {setup?.hasAnonymousProgress && (
              <label className="auth-import">
                <input
                  type="checkbox"
                  checked={migrate}
                  onChange={(event) => setMigrate(event.target.checked)}
                />
                <span>
                  <strong>Importar o progresso anterior deste computador</strong>
                  <span>
                    Havia um progresso criado antes das contas locais. Ele pode ser associado a esta
                    conta uma única vez; as próximas contas começarão vazias.
                  </span>
                </span>
              </label>
            )}

            <button className="button button--primary button--full" type="submit" disabled={busy}>
              {busy ? 'Criando conta…' : 'Criar conta local'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <p className="auth-page__local-note">
              Sem e-mail e sem sincronização. Guarde a senha e o código de recuperação que será
              exibido na próxima etapa.
            </p>
          </form>
          <div className="auth-page__links">
            <Link className="text-link" to="/entrar">
              Já tenho uma conta
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}
