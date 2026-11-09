import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Marca o onboarding como iniciado quando uma atividade elegível é aberta.
 * A conclusão do onboarding é registrada pelo servidor no primeiro progresso
 * real (exercício, laboratório ou caso), não apenas pela abertura da página.
 */
export function useEnterContent(enabled: boolean) {
  const { account, markOnboarding } = useAuth()

  useEffect(() => {
    if (!enabled || !account || account.onboardingStatus !== 'pending') return
    void markOnboarding('started')
  }, [enabled, account, markOnboarding])
}
