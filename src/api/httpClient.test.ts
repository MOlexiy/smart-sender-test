import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, expireSession, resetDb, TEST_CREDENTIALS } from '../mocks/db'
import { server } from '../mocks/node'
import { createApi } from './endpoints'
import { SessionExpiredError } from './errors'
import { HttpClient } from './httpClient'

const BASE_URL = 'http://api.test'
const FINGERPRINT = '0123456789abcdef0123456789abcdef'

function setup() {
  const client = new HttpClient({ baseUrl: BASE_URL, getFingerprint: () => FINGERPRINT })
  const api = createApi(client, () => FINGERPRINT)
  const onExpired = vi.fn()
  client.onSessionExpired(onExpired)
  return { client, api, onExpired }
}

/** Records every request path that reached the mock. */
function trackRequests() {
  const paths: string[] = []
  server.events.on('request:start', ({ request }) => {
    paths.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return paths
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

describe('HttpClient session rotation', () => {
  it('two parallel requests with 401 share one rotate and both retries succeed', async () => {
    const { api, onExpired } = setup()
    await api.auth.signIn(TEST_CREDENTIALS)
    expireSession()

    const requests = trackRequests()
    const [me, list] = await Promise.all([
      api.me(),
      api.webhooks.list({ page: 1, limit: 10, search: '' }),
    ])

    expect(me.email).toBe(TEST_CREDENTIALS.email)
    expect(list.data).toHaveLength(10)
    expect(db.stats.rotate).toBe(1)
    expect(requests.filter((r) => r === 'POST /auth/token/rotate')).toHaveLength(1)
    // 2 original requests (401) + 1 rotate + 2 retries (200)
    expect(requests).toHaveLength(5)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('ends the session when rotate fails', async () => {
    const { api, onExpired } = setup()
    // No session issued yet: /v1/me -> 401, rotate -> 400.
    const results = await Promise.allSettled([api.me(), api.me()])

    expect(results.every((r) => r.status === 'rejected' && r.reason instanceof SessionExpiredError)).toBe(true)
    expect(db.stats.rotate).toBe(1)
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('refetches CSRF token on 419 and retries once', async () => {
    const { api } = setup()
    let csrfCalls = 0
    server.use(
      http.get(`${BASE_URL}/csrf`, () => {
        csrfCalls += 1
        const token = csrfCalls === 1 ? 'stale-token' : 'mock-csrf-token-7f3a9c1e'
        return new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': token } })
      }),
    )

    await expect(api.auth.signIn(TEST_CREDENTIALS)).resolves.toBeUndefined()
    expect(csrfCalls).toBe(2)
  })
})
