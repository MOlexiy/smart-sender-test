import { createContext, useContext } from 'react'
import type { LoginCredentials, User } from '../api/types'

export type SessionState =
  | { status: 'checking'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: User }

export interface SessionContextValue {
  session: SessionState
  signIn: (credentials: LoginCredentials) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
