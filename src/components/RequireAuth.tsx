import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { account, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <span className="auth-loading__mark" aria-hidden="true" />
        <p>Carregando sua conta local…</p>
      </div>
    )
  }

  if (!account) {
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  if (location.pathname === '/' && account.onboardingStatus === 'pending') {
    return <Navigate to="/comecar" replace />
  }

  return <Outlet />
}
