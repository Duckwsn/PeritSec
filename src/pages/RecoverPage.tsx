import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleAlert, KeyRound, ShieldCheck } from 'lucide-react'
import { AuthShell } from '../components/AuthShell'
import { useAuth } from '../context/AuthContext'

export function RecoverPage() {
  const { account, loading, recoverAccess } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ recoveryCode: string; notice: string } | null>(null)
  const [busy, setBusy] = useState(false)

  if (account) return <Navigate to="/conta" replace />

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
    if (!username.trim() || !recoveryCode.trim()) {
      setError('Informe o usuário e o código de recuperação.')
      return
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    const response = await recoverAccess({
      username,
      recoveryCode,
      newPassword,
      confirmPassword,
    })
    setBusy(false)
    if (!response.ok) {
      setError(response.error)
      return
    }
    setResult(response.data)
  }

  return (
    <AuthShell>
      <div className="auth-page">
        <div className="auth-page__copy">
          <h1 className="text-balance">Redefinir o acesso sem e-mail.</h1>
          <p className="auth-page__lede">
            Cada conta local recebe um código de recuperação quando é criada. Ele permite definir
            uma nova senha neste computador. Se você perdeu o código, a conta pode ser recriada, mas
            o histórico anterior não pode ser recuperado sem uma cópia de backup.
          </p>
          <div className="auth-page__note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              A redefinição invalida as sessões abertas e gera um novo código. O código anterior
              deixa de funcionar.
            </p>
          </div>
        </div>

        <div className="auth-page__panel">
          {result ? (
            <div className="auth-recovery-result" role="status">
              <KeyRound size={24} aria-hidden="true" />
              <h2>Senha redefinida</h2>
              <p>{result.notice}</p>
              <div className="recovery-code" aria-label="Novo código de recuperação">
                <code>{result.recoveryCode}</code>
              </div>
              <p className="field__hint">
                Guarde este código fora do aplicativo. Ele não será exibido novamente.
              </p>
              <button
                type="button"
                className="button button--primary button--full"
                onClick={() => navigate('/entrar', { replace: true })}
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              <h2>Recuperar acesso</h2>
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
                  <span>Código de recuperação</span>
                  <input
                    type="text"
                    name="recoveryCode"
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value)}
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="XXXX-XXXX-XXXX"
                    required
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Nova senha</span>
                    <input
                      type="password"
                      name="newPassword"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Confirmar nova senha</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <button className="button button--primary button--full" type="submit" disabled={busy}>
                  {busy ? 'Redefinindo…' : 'Redefinir senha'}
                  <KeyRound size={16} aria-hidden="true" />
                </button>
              </form>
              <div className="auth-page__links">
                <Link className="text-link" to="/entrar">
                  <ArrowLeft size={14} aria-hidden="true" />
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
