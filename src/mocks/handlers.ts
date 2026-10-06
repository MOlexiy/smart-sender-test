import { delay, http, HttpResponse } from 'msw'
import type { ApiErrorBody, ApiErrorType, ValidationPayload, Webhook, WebhookList } from '../api/types'
import {
  CSRF_TOKEN,
  db,
  isSessionActive,
  SESSION_TTL_MS,
  startSession,
  TEST_CREDENTIALS,
  USER,
} from './db'

const PAGE_LIMIT = 10

const MESSAGES: Record<ApiErrorType, string> = {
  BadRequestException: 'Bad request.',
  AuthenticationException: 'Unauthenticated.',
  NotFoundException: 'Not found.',
  TokenMismatchException: 'CSRF token mismatch.',
  ValidationException: 'The given data was invalid.',
}

const STATUS: Record<ApiErrorType, number> = {
  BadRequestException: 400,
  AuthenticationException: 401,
  NotFoundException: 404,
  TokenMismatchException: 419,
  ValidationException: 422,
}

function errorResponse(type: ApiErrorType, payload?: ValidationPayload) {
  const body: ApiErrorBody = { error: { type, message: MESSAGES[type], ...(payload && { payload }) } }
  return HttpResponse.json(body, { status: STATUS[type] })
}

/** Checks CSRF before the operation runs, as the contract requires. */
function csrfFailure(request: Request) {
  return request.headers.get('X-CSRF-TOKEN') === CSRF_TOKEN ? null : errorResponse('TokenMismatchException')
}

function authFailure() {
  return isSessionActive() ? null : errorResponse('AuthenticationException')
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json()
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const handlers = [
  http.get('*/csrf', async () => {
    await delay()
    return new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': CSRF_TOKEN } })
  }),

  http.post('*/auth/login', async ({ request }) => {
    await delay()
    const csrf = csrfFailure(request)
    if (csrf) return csrf

    const body = await readJson(request)
    const email = asString(body.email)
    const password = asString(body.password)
    const fingerprint = asString(body.fingerprint)

    const errors: ValidationPayload = {}
    if (!request.headers.get('X-Captcha-Token')) errors.captcha = ['The captcha token is required.']
    if (!email) errors.email = ['The email field is required.']
    if (!password) errors.password = ['The password field is required.']
    if (!fingerprint) errors.fingerprint = ['The fingerprint field is required.']
    if (Object.keys(errors).length > 0) return errorResponse('ValidationException', errors)

    if (email.toLowerCase() !== TEST_CREDENTIALS.email || password !== TEST_CREDENTIALS.password) {
      return errorResponse('ValidationException', { password: ['These credentials do not match our records.'] })
    }

    const deviceSessionToken = randomHex(32)
    db.deviceTokens.set(deviceSessionToken, fingerprint)
    return HttpResponse.json({ device_session_token: deviceSessionToken })
  }),

  http.post('*/auth/token/issue', async ({ request }) => {
    await delay()
    const csrf = csrfFailure(request)
    if (csrf) return csrf

    const body = await readJson(request)
    const token = asString(body.device_session_token)
    const fingerprint = asString(body.fingerprint)
    if (!token || db.deviceTokens.get(token) !== fingerprint) {
      return errorResponse('ValidationException', { device_session_token: ['The device session token is invalid.'] })
    }
    db.deviceTokens.delete(token)
    startSession(fingerprint)
    return new HttpResponse(null, { status: 200 })
  }),

  http.post('*/auth/token/rotate', async ({ request }) => {
    await delay()
    const csrf = csrfFailure(request)
    if (csrf) return csrf

    db.stats.rotate += 1
    const body = await readJson(request)
    if (!db.session || db.session.fingerprint !== asString(body.fingerprint)) {
      return errorResponse('BadRequestException')
    }
    db.session.expiresAt = Date.now() + SESSION_TTL_MS
    return new HttpResponse(null, { status: 200 })
  }),

  http.post('*/auth/token/revoke', async ({ request }) => {
    await delay()
    const csrf = csrfFailure(request)
    if (csrf) return csrf
    db.session = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/v1/me', async () => {
    await delay()
    return authFailure() ?? HttpResponse.json(USER)
  }),

  http.get('*/v1/webhooks', async ({ request }) => {
    await delay()
    const unauthorized = authFailure()
    if (unauthorized) return unauthorized

    const params = new URL(request.url).searchParams
    const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
    const search = (params.get('search') ?? '').trim().toLowerCase()

    const filtered = search ? db.webhooks.filter((w) => w.name.toLowerCase().includes(search)) : db.webhooks
    const last = Math.max(1, Math.ceil(filtered.length / PAGE_LIMIT))
    const start = (page - 1) * PAGE_LIMIT

    const list: WebhookList = {
      data: filtered.slice(start, start + PAGE_LIMIT),
      paging: {
        pages: { current: page, last },
        results: { total: filtered.length, limitation: PAGE_LIMIT },
      },
    }
    return HttpResponse.json(list)
  }),

  http.get('*/v1/webhooks/:id', async ({ params }) => {
    await delay()
    const unauthorized = authFailure()
    if (unauthorized) return unauthorized

    const webhook = db.webhooks.find((w) => w.id === Number(params.id))
    return webhook ? HttpResponse.json(webhook) : errorResponse('NotFoundException')
  }),

  http.put('*/v1/webhooks/:id', async ({ request, params }) => {
    await delay()
    const csrf = csrfFailure(request)
    if (csrf) return csrf
    const unauthorized = authFailure()
    if (unauthorized) return unauthorized

    const index = db.webhooks.findIndex((w) => w.id === Number(params.id))
    const current = db.webhooks[index]
    if (!current) return errorResponse('NotFoundException')

    const body = await readJson(request)
    const name = asString(body.name).trim()
    const url = asString(body.url).trim()

    const errors: ValidationPayload = {}
    if (!name) errors.name = ['The name field is required.']
    else if (name.length > 255) errors.name = ['The name may not be greater than 255 characters.']
    if (!url) errors.url = ['The url field is required.']
    else if (!isHttpUrl(url)) errors.url = ['The url must be a valid URL.']
    if (Object.keys(errors).length > 0) return errorResponse('ValidationException', errors)

    const updated: Webhook = { ...current, name, url }
    db.webhooks[index] = updated
    return HttpResponse.json(updated)
  }),
]
