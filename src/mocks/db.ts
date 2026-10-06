import type { User, Webhook } from '../api/types'

/**
 * In-memory "server" state. Lives as long as the JS context (page reload resets it,
 * which the task explicitly allows: the user simply logs in again).
 */

export const TEST_CREDENTIALS = {
  email: 'demo@smartsender.dev',
  password: 'password123',
} as const

export const CSRF_TOKEN = 'mock-csrf-token-7f3a9c1e'
export const SESSION_TTL_MS = 30_000

export const USER: User = {
  id: 1,
  email: TEST_CREDENTIALS.email,
  first_name: 'Demo',
  last_name: 'User',
  name: 'Demo User',
}

interface Session {
  fingerprint: string
  expiresAt: number
}

const WEBHOOK_TOPICS = [
  'Order created', 'Order paid', 'Order cancelled', 'Order refunded', 'Subscriber added',
  'Subscriber removed', 'Message delivered', 'Message failed', 'Chat opened', 'Chat closed',
  'Payment succeeded', 'Payment failed', 'Invoice issued', 'Lead captured', 'Lead qualified',
  'Campaign started', 'Campaign finished', 'Tag assigned', 'Tag removed', 'Form submitted',
  'Bot error', 'Operator assigned', 'Operator released', 'Contact updated', 'Contact merged',
  'Funnel step passed', 'Webinar registration', 'Trial expired',
] as const

function seedWebhooks(): Webhook[] {
  const base = Date.UTC(2026, 0, 1)
  return WEBHOOK_TOPICS.map((topic, index) => {
    const slug = topic.toLowerCase().replace(/\s+/g, '-')
    return {
      id: index + 1,
      name: topic,
      url: `https://hooks.example.com/${slug}`,
      active: index % 3 !== 2,
      created_at: new Date(base + index * 86_400_000).toISOString(),
    }
  })
}

export const db = {
  webhooks: seedWebhooks(),
  /** device_session_token -> fingerprint; one-time use. */
  deviceTokens: new Map<string, string>(),
  /** Emulates the HttpOnly session cookie: invisible to the client. */
  session: null as Session | null,
  stats: { rotate: 0 },
}

export function resetDb(): void {
  db.webhooks = seedWebhooks()
  db.deviceTokens.clear()
  db.session = null
  db.stats.rotate = 0
}

export function startSession(fingerprint: string): void {
  db.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS }
}

export function isSessionActive(): boolean {
  return db.session !== null && db.session.expiresAt > Date.now()
}

/** Test helper: make the current session expire immediately. */
export function expireSession(): void {
  if (db.session) db.session.expiresAt = 0
}
