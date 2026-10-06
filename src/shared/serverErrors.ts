import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '../api/errors'

/**
 * Puts 422 field errors next to the matching form fields.
 * Returns a message for everything that could not be attached to a field (shown above the form).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  if (!isApiError(error)) return 'Something went wrong. Please try again.'
  if (!error.isValidation || !error.payload) return error.message

  const unmapped: string[] = []
  let firstField = true
  for (const [field, messages] of Object.entries(error.payload)) {
    const message = messages.join(' ')
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: firstField })
      firstField = false
    } else {
      unmapped.push(message)
    }
  }
  return unmapped.length > 0 ? unmapped.join(' ') : null
}
