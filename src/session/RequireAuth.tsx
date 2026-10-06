import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageSpinner } from '../shared/ui'
import { useSession } from './SessionContext'

export interface LoginRedirectState {
  from?: { pathname: string; search: string }
}

export function RequireAuth() {
  const { session } = useSession()
  const location = useLocation()

  if (session.status === 'checking') return <FullPageSpinner />
  if (session.status === 'anonymous') {
    const state: LoginRedirectState = { from: { pathname: location.pathname, search: location.search } }
    return <Navigate to="/login" replace state={state} />
  }
  return <Outlet />
}
