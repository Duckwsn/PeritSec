import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CircleAlert, LockKeyhole, ShieldCheck } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const {
    account,
    setup,
    loading,
    backendError,
    sessionMessage,
    clearSessionMessage,
    login,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (account) {
    return <Navigate to={account.onboardingStatus === 'pending' ? '/comecar' : '/'} replace />
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

  const firstAccess = setup && !setup.hasAccounts
  const state = location.state as LocationState | null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    clearSessionMessage()
    if (!username.trim() || !password) {
      setError('Informe o nome de usuário e a senha.')
      return
    }
    setBusy(true)
    const result = await login({ username, password })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const from = state?.from
    const destination =
      result.data.account.onboardingStatus === 'pending'
        ? '/comecar'
        : from && from.startsWith('/') && !from.startsWith('/entrar')
          ? from
          : '/'
    navigate(destination, { replace: true })
  }

  return (
    <AuthShell>
      <div className="auth-page">
        <div className="auth-page__copy">
          <h1 className="text-balance">Entre para continuar sua jornada.</h1>
          <p className="auth-page__lede">
            Seu progresso, suas competências e seu histórico de investigação ficam separados por
            conta nesta instalação. O PeritSec não usa e-mail, nuvem ou login externo.
          </p>
          <div className="auth-page__note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              As contas pertencem a este computador. Uma senha local organiza o acesso dentro do
              aplicativo; ela não substitui a proteção da sua conta do Windows.
            </p>
          </div>
        </div>

        <div className="auth-page__panel">
          {firstAccess ? (
            <div className="auth-first-access">
              <h2>Primeiro acesso</h2>
              <p>
                Esta instalação ainda não tem nenhuma conta. Crie a primeira conta local para
                começar e, se quiser, traga o progresso que já existe neste computador.
              </p>
              <Link className="button button--primary button--full" to="/criar-conta">
                Criar a primeira conta
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <h2>Entrar</h2>
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {sessionMessage && (
                  <div className="field-feedback field-feedback--warn" role="alert">
                    <CircleAlert size={17} aria-hidden="true" />
                    <span>{sessionMessage}</span>
                  </div>
                )}
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
                <label className="field">
                  <span>Nome de usuário</span>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                </label>
                <label className="field">
                  <span>Senha</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <button className="button button--primary button--full" type="submit" disabled={busy}>
                  {busy ? 'Entrando…' : 'Entrar'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </form>
              <div className="auth-page__links">
                <Link className="text-link" to="/recuperar">
                  <LockKeyhole size={14} aria-hidden="true" />
                  Esqueci minha senha
                </Link>
                <Link className="text-link" to="/criar-conta">
                  Criar outra conta local
                </Link>
              </div>
              <p className="auth-page__local-note">
                Sessão de {setup?.sessionPolicy.label ?? '30 dias a partir do login'}. Ao sair, o
                progresso da conta permanece salvo.
              </p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
