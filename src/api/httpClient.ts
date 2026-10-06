import { ApiError, isApiErrorBody, SessionExpiredError } from './errors'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  query?: Record<string, string | number | undefined>
  headers?: Record<string, string>
  signal?: AbortSignal
  /**
   * Protected request: on 401 the client rotates the session and retries once.
   * Auth endpoints (login/issue/rotate/revoke) pass `false`, so rotate never triggers another rotate.
   */
  protected?: boolean
}

export interface HttpClientOptions {
  baseUrl?: string
  getFingerprint: () => string
}

type SessionExpiredListener = () => void

const UNSAFE_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE'])
const CSRF_HEADER = 'X-CSRF-TOKEN'

/**
 * Transport layer: CSRF bootstrap/refresh, session rotation and retries.
 * Knows nothing about React or concrete endpoints besides /csrf and /auth/token/rotate.
 */
export class HttpClient {
  private readonly baseUrl: string
  private readonly getFingerprint: () => string

  private csrfToken: string | null = null
  private csrfRequest: Promise<string> | null = null

  /** Shared in-flight rotate: concurrent 401s await the same promise. */
  private rotateRequest: Promise<void> | null = null
  /** Incremented on every successful rotate; lets a late 401 detect that the session was already renewed. */
  private sessionEpoch = 0

  private readonly expiredListeners = new Set<SessionExpiredListener>()

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl ?? ''
    this.getFingerprint = options.getFingerprint
  }

  onSessionExpired(listener: SessionExpiredListener): () => void {
    this.expiredListeners.add(listener)
    return () => this.expiredListeners.delete(listener)
  }

  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  put<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const isProtected = options.protected ?? true
    let csrfRetried = false
    let sessionRetried = false

    for (;;) {
      const epochAtSend = this.sessionEpoch
      const response = await this.send(path, options)

      if (response.status === 419 && !csrfRetried) {
        csrfRetried = true
        this.csrfToken = null
        await this.ensureCsrf()
        continue
      }

      if (response.status === 401 && isProtected) {
        if (sessionRetried) {
          this.expireSession()
          throw new SessionExpiredError()
        }
        sessionRetried = true
        await this.renewSession(epochAtSend)
        continue
      }

      if (!response.ok) {
        throw new ApiError(response.status, await readErrorBody(response))
      }

      return (await readBody(response)) as T
    }
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const method = options.method ?? 'GET'
    const headers = new Headers({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    })

    // GET /csrf must precede every other API request.
    const csrfToken = await this.ensureCsrf()
    if (UNSAFE_METHODS.has(method)) headers.set(CSRF_HEADER, csrfToken)

    let body: string | undefined
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }

    return fetch(this.buildUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: 'include',
      signal: options.signal ?? null,
    })
  }

  private ensureCsrf(): Promise<string> {
    if (this.csrfToken) return Promise.resolve(this.csrfToken)
    this.csrfRequest ??= this.fetchCsrf().finally(() => {
      this.csrfRequest = null
    })
    return this.csrfRequest
  }

  private async fetchCsrf(): Promise<string> {
    const response = await fetch(this.buildUrl('/csrf'), {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
    })
    const token = response.headers.get(CSRF_HEADER)
    if (!response.ok || !token) {
      throw new ApiError(response.status, await readErrorBody(response))
    }
    this.csrfToken = token
    return token
  }

  /**
   * Rotates the session once for all callers that got 401 in the same "epoch".
   * If the session was already rotated after this request was sent, just retry.
   */
  private async renewSession(epochAtSend: number): Promise<void> {
    if (epochAtSend !== this.sessionEpoch) return

    this.rotateRequest ??= this.rotate().finally(() => {
      this.rotateRequest = null
    })
    await this.rotateRequest
  }

  private async rotate(): Promise<void> {
    try {
      await this.request<void>('/auth/token/rotate', {
        method: 'POST',
        body: { fingerprint: this.getFingerprint() },
        protected: false,
      })
      this.sessionEpoch += 1
    } catch {
      this.expireSession()
      throw new SessionExpiredError()
    }
  }

  private expireSession(): void {
    this.expiredListeners.forEach((listener) => listener())
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') search.set(key, String(value))
    }
    const qs = search.toString()
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  return text ? (JSON.parse(text) as unknown) : undefined
}

async function readErrorBody(response: Response) {
  try {
    const body = await readBody(response)
    return isApiErrorBody(body) ? body : null
  } catch {
    return null
  }
}
