import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Api } from '../api/endpoints'
import type { HttpClient } from '../api/httpClient'
import type { LoginCredentials } from '../api/types'
import { SessionContext, type SessionContextValue, type SessionState } from './SessionContext'

interface Props {
  api: Api
  client: HttpClient
  children: ReactNode
}

const ANONYMOUS: SessionState = { status: 'anonymous', user: null }

/**
 * Owns the local session: who is logged in and the transitions between states.
 * Tokens themselves are never here — the session cookie is managed by the server (mock).
 */
export function SessionProvider({ api, client, children }: Props) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<SessionState>({ status: 'checking', user: null })

  const clearLocalSession = useCallback(() => {
    void queryClient.cancelQueries()
    queryClient.clear()
    setSession(ANONYMOUS)
  }, [queryClient])

  // Rotate failed or 401 after retry -> drop to the login screen.
  useEffect(() => client.onSessionExpired(clearLocalSession), [client, clearLocalSession])

  // On start-up try to resume an existing server session (works with a real cookie;
  // with the in-memory mock a reload simply leads to the login screen).
  useEffect(() => {
    const controller = new AbortController()
    api
      .me(controller.signal)
      .then((user) => setSession({ status: 'authenticated', user }))
      .catch(() => {
        if (!controller.signal.aborted) setSession(ANONYMOUS)
      })
    return () => controller.abort()
  }, [api])

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      await api.auth.signIn(credentials)
      const user = await api.me()
      setSession({ status: 'authenticated', user })
    },
    [api],
  )

  const signOut = useCallback(async () => {
    try {
      await api.auth.signOut()
    } finally {
      // Even if revoke fails the user must end up logged out locally.
      clearLocalSession()
    }
  }, [api, clearLocalSession])

  const value = useMemo<SessionContextValue>(() => ({ session, signIn, signOut }), [session, signIn, signOut])

  return <SessionContext value={value}>{children}</SessionContext>
}
