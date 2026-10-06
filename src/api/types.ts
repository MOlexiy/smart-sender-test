/** Shapes defined by the API contract. */

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  name: string
}

export interface Webhook {
  id: number
  name: string
  url: string
  active: boolean
  created_at: string
}

export interface WebhookList {
  data: Webhook[]
  paging: {
    pages: { current: number; last: number }
    results: { total: number; limitation: number }
  }
}

export interface WebhookListParams {
  page: number
  limit: number
  search: string
}

export interface WebhookUpdate {
  name: string
  url: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export type ApiErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException'

/** Field name -> list of messages. */
export type ValidationPayload = Record<string, string[]>

export interface ApiErrorBody {
  error: {
    type: ApiErrorType
    message: string
    payload?: ValidationPayload
  }
}
