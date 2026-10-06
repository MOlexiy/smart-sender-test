import type { ApiErrorBody, ApiErrorType, ValidationPayload } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly type: ApiErrorType | 'UnknownException'
  readonly payload: ValidationPayload | undefined

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.type = body?.error.type ?? 'UnknownException'
    this.payload = body?.error.payload
  }

  get isValidation(): boolean {
    return this.status === 422
  }
}

/** Thrown when the session cannot be restored (rotate failed or 401 after retry). */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired')
    this.name = 'SessionExpiredError'
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status)
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const { error } = value as { error: unknown }
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error
}
