import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Webhook, WebhookUpdate } from '../../api/types'
import { applyServerErrors } from '../../shared/serverErrors'
import { Alert } from '../../shared/ui'

const FIELDS = ['name', 'url'] as const

interface Props {
  webhook: Webhook
  onSubmit: (data: WebhookUpdate) => Promise<unknown>
  onCancel: () => void
}

/**
 * Validation is intentionally server-side only: the contract defines the rules,
 * and 422 messages are rendered next to the fields they belong to.
 */
export function WebhookForm({ webhook, onSubmit, onCancel }: Props) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WebhookUpdate>({ defaultValues: { name: webhook.name, url: webhook.url } })

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      await onSubmit(data)
    } catch (error) {
      setFormError(applyServerErrors(error, FIELDS, setError))
    }
  })

  return (
    <form className="card form" onSubmit={submit} noValidate>
      {formError && <Alert>{formError}</Alert>}

      <label className="field">
        <span>Name</span>
        <input aria-invalid={Boolean(errors.name)} {...register('name')} />
        {errors.name && <small className="field__error">{errors.name.message}</small>}
      </label>

      <label className="field">
        <span>URL</span>
        <input type="url" inputMode="url" aria-invalid={Boolean(errors.url)} {...register('url')} />
        {errors.url && <small className="field__error">{errors.url.message}</small>}
      </label>

      <div className="form__actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
