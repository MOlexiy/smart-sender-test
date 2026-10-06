import { getFingerprint } from '../shared/fingerprint'
import { createApi } from './endpoints'
import { HttpClient } from './httpClient'

export const httpClient = new HttpClient({ baseUrl: import.meta.env.VITE_API_URL ?? '', getFingerprint })
export const api = createApi(httpClient, getFingerprint)

export type { Api } from './endpoints'
export { ApiError, SessionExpiredError, isApiError } from './errors'
export type * from './types'
