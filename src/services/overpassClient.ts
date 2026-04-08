/**
 * Shared Overpass API client with serial queue.
 *
 * The public Overpass API allows ~2 concurrent requests per IP.
 * To avoid 429/504 errors, we serialize ALL Overpass requests through
 * a single queue — only 1 request in flight at a time, with a
 * mandatory cooldown between requests.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const MAX_RETRIES = 5
const BASE_DELAY_MS = 5_000 // 5s base (was 2s — too aggressive)
const COOLDOWN_MS = 1_500 // wait between consecutive requests

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
      // Cooldown after successful request
      return delay(COOLDOWN_MS).then(() => val)
    },
    (err) => {
      return delay(COOLDOWN_MS).then(() => { throw err })
    }
  )

  // Update pending chain (ignore errors so queue keeps moving)
  pending = result.then(() => {}, () => {})

  return result
}

// ---------------------------------------------------------------------------
// Core query function (called inside the queue)
// ---------------------------------------------------------------------------

async function queryOverpassDirect(query: string): Promise<OverpassResponse> {
  let attempt = 0

  while (true) {
    attempt++

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (response.ok) {
      return (await response.json()) as OverpassResponse
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(
          `Overpass API error ${response.status} after ${MAX_RETRIES} retries`
        )
      }
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
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

// ---------------------------------------------------------------------------
// Public API — all callers use this
// ---------------------------------------------------------------------------

/**
 * Execute an Overpass QL query. Requests are serialized — only 1 in flight
 * at a time with a cooldown between them.
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
