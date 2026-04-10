/**
 * Shared Overpass API client with mirror rotation, circuit breaker, and serial queue.
 *
 * Resilience strategy:
 * 1. Multiple mirrors — rotate on 429/5xx/network errors
 * 2. Circuit breaker — mark dead mirrors with cooldown (don't re-hit for 5 min)
 * 3. Retry-After header — respect server-requested wait times
 * 4. Generous retries (10) with exponential backoff up to 60s
 * 5. Serial queue — only 1 request in flight at a time to minimize rate limits
 */

const OVERPASS_MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',   // primary — no rate limits
  'https://overpass-api.de/api/interpreter',            // main (global, but rate-limited)
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter', // VK Maps (may be suspended)
]

const MAX_RETRIES = 10
const BASE_DELAY_MS = 5_000
const MAX_DELAY_MS = 60_000
const COOLDOWN_MS = 2_000
const CIRCUIT_BREAKER_MS = 5 * 60_000 // 5 minutes

export interface RateLimitEvent {
  /** Timestamp (ms) when this rate limit started */
  startedAt: number
  /** How long to wait (ms) */
  delayMs: number
  /** Which mirror returned 429 */
  mirror: string
  /** Current attempt number */
  attempt: number
  /** Max attempts */
  maxAttempts: number
}

export type RateLimitListener = (event: RateLimitEvent | null) => void

let rateLimitListener: RateLimitListener | null = null

/** Subscribe to rate-limit events. Pass null to clear. */
export function onRateLimit(listener: RateLimitListener | null): void {
  rateLimitListener = listener
}

/** Circuit breaker: track when each mirror was marked dead */
const mirrorDeadUntil: number[] = OVERPASS_MIRRORS.map(() => 0)

/** Track which mirror to try next */
let currentMirrorIndex = 0

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Record<string, string>
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: Array<{ lat: number; lon: number }>
}

export interface OverpassResponse {
  elements: OverpassElement[]
}

// ---------------------------------------------------------------------------
// Serial queue
// ---------------------------------------------------------------------------

let pending: Promise<void> = Promise.resolve()

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = pending.then(() => fn()).then(
    (val) => {
      return delay(COOLDOWN_MS).then(() => val)
    },
    (err) => {
      return delay(COOLDOWN_MS).then(() => { throw err })
    }
  )

  pending = result.then(() => {}, () => {})
  return result
}

// ---------------------------------------------------------------------------
// Mirror management with circuit breaker
// ---------------------------------------------------------------------------

/** Find the next alive mirror, or the least-dead one if all are dead */
function findAliveMirror(): number {
  const now = Date.now()
  // First pass: find an alive mirror starting from current
  for (let i = 0; i < OVERPASS_MIRRORS.length; i++) {
    const idx = (currentMirrorIndex + i) % OVERPASS_MIRRORS.length
    if (mirrorDeadUntil[idx] <= now) return idx
  }
  // All dead — pick the one that will recover soonest
  let soonestIdx = 0
  let soonestTime = mirrorDeadUntil[0]
  for (let i = 1; i < mirrorDeadUntil.length; i++) {
    if (mirrorDeadUntil[i] < soonestTime) {
      soonestTime = mirrorDeadUntil[i]
      soonestIdx = i
    }
  }
  return soonestIdx
}

function markMirrorDead(idx: number): void {
  mirrorDeadUntil[idx] = Date.now() + CIRCUIT_BREAKER_MS
}

function rotateMirror(): void {
  const next = (currentMirrorIndex + 1) % OVERPASS_MIRRORS.length
  currentMirrorIndex = findAliveMirror()
  if (currentMirrorIndex === next) return // already rotated
  currentMirrorIndex = next
}

// ---------------------------------------------------------------------------
// Core query function with mirror rotation + circuit breaker
// ---------------------------------------------------------------------------

async function queryOverpassDirect(query: string): Promise<OverpassResponse> {
  let attempt = 0
  let consecutiveFailures = 0

  while (true) {
    attempt++
    currentMirrorIndex = findAliveMirror()
    const mirrorUrl = OVERPASS_MIRRORS[currentMirrorIndex]

    let response: Response
    try {
      response = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
    } catch (networkErr) {
      consecutiveFailures++
      markMirrorDead(currentMirrorIndex)
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Overpass API network error after ${MAX_RETRIES} retries: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`
        )
      }
      rotateMirror()
      await delay(Math.min(BASE_DELAY_MS * Math.pow(2, consecutiveFailures - 1), MAX_DELAY_MS))
      continue
    }

    if (response.ok) {
      // Clear rate-limit status on success
      rateLimitListener?.(null)
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('json')) {
        consecutiveFailures++
        markMirrorDead(currentMirrorIndex)
        if (attempt >= MAX_RETRIES) {
          throw new Error(
            `Overpass mirror returned non-JSON (${contentType}) after ${MAX_RETRIES} retries`
          )
        }
        rotateMirror()
        await delay(BASE_DELAY_MS)
        continue
      }
      // Success — reset consecutive failures
      consecutiveFailures = 0
      return (await response.json()) as OverpassResponse
    }

    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      consecutiveFailures++
      markMirrorDead(currentMirrorIndex)

      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Overpass API error ${response.status} after ${MAX_RETRIES} retries (tried ${OVERPASS_MIRRORS.length} mirrors)`
        )
      }

      rotateMirror()

      // Respect Retry-After header if present
      const retryAfter = response.headers.get('retry-after')
      let delayMs: number
      if (retryAfter) {
        const retrySeconds = parseInt(retryAfter, 10)
        delayMs = (isNaN(retrySeconds) ? BASE_DELAY_MS : retrySeconds * 1000)
      } else {
        // Exponential backoff: 5s, 10s, 20s, 40s, 60s (capped)
        delayMs = Math.min(BASE_DELAY_MS * Math.pow(2, consecutiveFailures - 1), MAX_DELAY_MS)
      }
      rateLimitListener?.({
        startedAt: Date.now(),
        delayMs,
        mirror: mirrorUrl,
        attempt,
        maxAttempts: MAX_RETRIES,
      })
      await delay(delayMs)
      continue
    }

    // 400 or other client error — no point retrying
    const text = await response.text().catch(() => '')
    throw new Error(
      `Overpass API error ${response.status}: ${text.slice(0, 200)}`
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute an Overpass QL query. Serialized through a queue with mirror
 * rotation and circuit breaker on 429/5xx errors.
 */
export function queryOverpass(query: string): Promise<OverpassResponse> {
  return enqueue(() => queryOverpassDirect(query))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
