const STORAGE_KEY = 'ss.device_fingerprint'
const FINGERPRINT_RE = /^[0-9a-f]{32}$/

let cached: string | null = null

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function readStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeStorage(value: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value)
  } catch {
    // Storage may be unavailable (private mode, quota). The in-memory value still works for this tab.
  }
}

/** Stable device id: 32 hex chars, generated once and persisted in localStorage. */
export function getFingerprint(): string {
  if (cached) return cached
  const stored = readStorage()
  if (stored && FINGERPRINT_RE.test(stored)) {
    cached = stored
    return stored
  }
  cached = generate()
  writeStorage(cached)
  return cached
}
