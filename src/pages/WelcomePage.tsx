import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { levelLabel, nextActivity } from '../lib/progression'

export function WelcomePage() {
  const { account, recoveryReceipt, clearRecoveryReceipt } = useAuth()
  const { progress } = useProgress()
  const navigate = useNavigate()

  if (!account) return null

  if (account.onboardingStatus !== 'pending') {
    if (!recoveryReceipt?.migrated) {
      return <Navigate to="/" replace />
    }
    return (
      <div className="welcome welcome--recovery">
        <div className="welcome__copy">
          <h1>Conta local criada.</h1>
          <p>
            O progresso anterior foi associado à sua conta. Guarde o código de recuperação abaixo;
            ele permite redefinir a senha sem e-mail. A orientação inicial não será repetida porque
            esta conta já possui histórico.
          </p>
          <div className="recovery-code" aria-label="Código de recuperação">
            <code>{recoveryReceipt.recoveryCode}</code>
          </div>
          {recoveryReceipt.recoveryNotice && (
            <p className="field__hint">{recoveryReceipt.recoveryNotice}</p>
          )}
          <div className="welcome__actions">
            <Link className="button button--primary" to="/" onClick={clearRecoveryReceipt}>
              Ir para a visão geral
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link className="button button--outline" to="/conta" onClick={clearRecoveryReceipt}>
              Abrir configurações da conta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const recommendation = nextActivity(account.expertise, progress)
  const level = levelLabel(account.expertise)

  function handleStart() {
    if (!recommendation?.href) return
    clearRecoveryReceipt()
    navigate(recommendation.href)
  }

  return (
    <div className="welcome">
      <section className="welcome__intro" aria-labelledby="welcome-title">
        <h1 id="welcome-title">Comece por aqui!</h1>
        <p className="welcome__greeting">Olá, {account.displayName}.</p>
        <p className="welcome__lede">
          Sua conta está pronta. O PeritSec combina uma lição curta, prática verificável e
          progressão por competências. Você começa pelo nível <strong>{level}</strong>; a cada
          etapa concluída, novas atividades podem ser liberadas — desde que os pré-requisitos
          correspondentes também tenham sido demonstrados.
        </p>
      </section>

      <section className="welcome__next" aria-labelledby="welcome-next-title">
        <div>
          <h2 id="welcome-next-title">Sua primeira atividade recomendada</h2>
          {recommendation ? (
            <>
              <p className="welcome__next-title">{recommendation.title}</p>
              <p>
                Esta recomendação foi calculada com as regras reais da jornada para o seu nível e
                para o progresso atual. Ela não é um link simulado e pode ser retomada depois.
              </p>
              <div className="welcome__actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleStart}
                >
                  Começar primeira atividade
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <Link className="button button--outline" to="/trilhas">
                  Ver todas as trilhas
                </Link>
              </div>
            </>
          ) : (
            <p>
              Não há uma atividade desbloqueada no momento. Abra a jornada completa para revisar o
              que já foi concluído.
            </p>
          )}
        </div>
      </section>

      <section className="welcome__how" aria-labelledby="welcome-how-title">
        <h2 id="welcome-how-title">Como a progressão funciona</h2>
        <ul>
          <li>Lições liberam competências quando todos os exercícios são resolvidos.</li>
          <li>Laboratórios contam quando o objetivo técnico é verificado, não quando a página abre.</li>
          <li>Casos periciais exigem nível efetivo, competências e o relatório previsto na rubrica.</li>
        </ul>
        <p className="welcome__local">
          <ShieldCheck size={16} aria-hidden="true" />
          Conta e progresso ficam neste computador. O nível orienta o início; ele não libera
          automaticamente um caso avançado.
        </p>
      </section>

      {recoveryReceipt && (
        <aside className="welcome__recovery" aria-labelledby="recovery-title">
          <div>
            <h2 id="recovery-title">
              <KeyRound size={18} aria-hidden="true" /> Código de recuperação local
            </h2>
            <p>{recoveryReceipt.recoveryNotice}</p>
          </div>
          <div className="recovery-code" aria-label="Código de recuperação">
            <code>{recoveryReceipt.recoveryCode}</code>
          </div>
          <p className="field__hint">
            Guarde fora do aplicativo. Você também pode gerar um novo código mais tarde em Conta.
          </p>
        </aside>
      )}
    </div>
  )
}
