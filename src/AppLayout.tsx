import { Outlet } from 'react-router'
import { useSession } from './session/SessionContext'

export function AppLayout() {
  const { session, signOut } = useSession()

  return (
    <div className="layout">
      <header className="topbar">
        <strong>Smart Sender</strong>
        <div className="topbar__user">
          {session.user && <span>{session.user.name}</span>}
          <button type="button" className="btn" onClick={() => void signOut()}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
