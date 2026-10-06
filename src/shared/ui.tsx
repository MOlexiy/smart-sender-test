import type { ReactNode } from 'react'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dot" aria-hidden />
      {label}
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="center-screen">
      <Spinner />
    </div>
  )
}

export function Alert({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="alert" role="alert">
      <span>{children}</span>
      {action}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
