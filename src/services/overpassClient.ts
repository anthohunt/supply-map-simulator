/**
 * Shared Overpass API client with mirror rotation and serial queue.
 *
 * Uses multiple public Overpass mirrors to avoid 429 rate limits.
 * Primary: private.coffee (no rate limits). Fallbacks rotate on failure.
 * All requests are serialized — only 1 in flight at a time.
 */

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',          // main (global data)
  'https://overpass.private.coffee/api/interpreter',   // global, no rate limits
]

const MAX_RETRIES = 5
const BASE_DELAY_MS = 3_000
const COOLDOWN_MS = 1_000

/** Track which mirror to try next on failure */
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
// Core query function with mirror rotation
// ---------------------------------------------------------------------------

async function queryOverpassDirect(query: string): Promise<OverpassResponse> {
  let attempt = 0

  while (true) {
    attempt++
    const mirrorUrl = OVERPASS_MIRRORS[currentMirrorIndex]

    let response: Response
    try {
      response = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })
    } catch (networkErr) {
      // Network error (DNS, timeout, etc.) — rotate mirror and retry
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Overpass API network error after ${MAX_RETRIES} retries: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`
        )
      }
      rotateMirror()
      await delay(BASE_DELAY_MS)
      continue
    }

    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? ''
      // Some mirrors return XML or HTML error pages with 200 status
      if (!contentType.includes('json')) {
        // Not JSON — treat as a bad mirror, rotate and retry
        if (attempt >= MAX_RETRIES) {
          throw new Error(
            `Overpass mirror returned non-JSON (${contentType}) after ${MAX_RETRIES} retries`
          )
        }
        rotateMirror()
        await delay(BASE_DELAY_MS)
        continue
      }
      return (await response.json()) as OverpassResponse
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Overpass API error ${response.status} after ${MAX_RETRIES} retries (tried ${OVERPASS_MIRRORS.length} mirrors)`
        )
      }

      // Rotate to next mirror immediately on 429
      rotateMirror()

      // Backoff: 3s, 6s, 12s, 24s, 48s
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1)
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

function rotateMirror(): void {
  currentMirrorIndex = (currentMirrorIndex + 1) % OVERPASS_MIRRORS.length
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute an Overpass QL query. Serialized through a queue with mirror
 * rotation on 429/5xx errors.
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
