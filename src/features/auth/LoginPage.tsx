import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { LoginCredentials } from '../../api/types'
import type { LoginRedirectState } from '../../session/RequireAuth'
import { useSession } from '../../session/SessionContext'
import { applyServerErrors } from '../../shared/serverErrors'
import { Alert } from '../../shared/ui'

const FIELDS = ['email', 'password'] as const

export function LoginPage() {
  const { session, signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({ defaultValues: { email: '', password: '' } })

  // Go back to where the user was (including list page/search) after login.
  const from = (location.state as LoginRedirectState | null)?.from
  const target = from ? `${from.pathname}${from.search}` : '/webhooks'

  if (session.status === 'authenticated') return <Navigate to={target} replace />

  const onSubmit = handleSubmit(async (credentials) => {
    setFormError(null)
    try {
      await signIn(credentials)
      void navigate(target, { replace: true })
    } catch (error) {
      setFormError(applyServerErrors(error, FIELDS, setError))
    }
  })

  return (
    <div className="center-screen">
      <form className="card login" onSubmit={onSubmit} noValidate>
        <h1>Smart Sender</h1>
        <p className="muted">Sign in to manage webhooks</p>

        {formError && <Alert>{formError}</Alert>}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(errors.email)}
            {...register('email', { required: 'Email is required.' })}
          />
          {errors.email && <small className="field__error">{errors.email.message}</small>}
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password', { required: 'Password is required.' })}
          />
          {errors.password && <small className="field__error">{errors.password.message}</small>}
        </label>

        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
