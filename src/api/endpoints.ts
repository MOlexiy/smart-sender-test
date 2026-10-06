import type { HttpClient } from './httpClient'
import type { LoginCredentials, User, Webhook, WebhookList, WebhookListParams, WebhookUpdate } from './types'

/** There is no real captcha widget; the mock accepts any non-empty value. */
const CAPTCHA_STUB_TOKEN = 'captcha-stub'

export function createApi(client: HttpClient, getFingerprint: () => string) {
  return {
    auth: {
      /**
       * login -> device_session_token -> issue.
       * The device token lives only in this function's scope: never stored, never put in the URL.
       */
      async signIn(credentials: LoginCredentials): Promise<void> {
        const fingerprint = getFingerprint()
        const { device_session_token } = await client.post<{ device_session_token: string }>(
          '/auth/login',
          { ...credentials, fingerprint },
          { protected: false, headers: { 'X-Captcha-Token': CAPTCHA_STUB_TOKEN } },
        )
        await client.post<void>('/auth/token/issue', { device_session_token, fingerprint }, { protected: false })
      },

      signOut(): Promise<void> {
        return client.post<void>('/auth/token/revoke', { fingerprint: getFingerprint() }, { protected: false })
      },
    },

    me(signal?: AbortSignal): Promise<User> {
      return client.get<User>('/v1/me', { signal })
    },

    webhooks: {
      list({ page, limit, search }: WebhookListParams, signal?: AbortSignal): Promise<WebhookList> {
        return client.get<WebhookList>('/v1/webhooks', { query: { page, limit, search }, signal })
      },
      get(id: number, signal?: AbortSignal): Promise<Webhook> {
        return client.get<Webhook>(`/v1/webhooks/${id}`, { signal })
      },
      update(id: number, data: WebhookUpdate): Promise<Webhook> {
        return client.put<Webhook>(`/v1/webhooks/${id}`, data)
      },
    },
  }
}

export type Api = ReturnType<typeof createApi>
