# M2 Build Decisions Log

## Decision 1: Serialize Overpass API Queries
**Problem:** Pipeline fired 3 concurrent Overpass queries (roads, rail, infrastructure). The public API only allows ~2 concurrent requests per IP → 429 rate limit errors.
**Fix:** Run FAF first (bundled data, no API), then OSM, then Infrastructure sequentially. Created `overpassClient.ts` with a serial queue — only 1 Overpass request in flight at a time.
**Impact:** Pipeline is slower (sequential) but reliable. No more 429 cascades.

## Decision 2: Rotate Across Overpass Mirrors
**Problem:** Even with serial requests, the main `overpass-api.de` instance was rate limiting after prior failed attempts.
**Fix:** Added 3 mirrors: `private.coffee` (primary, no rate limits), `overpass-api.de`, `maprva.org`. On 429/5xx, automatically rotates to next mirror before retrying.
**Impact:** Much higher success rate. `private.coffee` handles most queries without limits.

## Decision 3: Validate Content-Type Before JSON Parse
**Problem:** Some mirrors return XML/HTML error pages with HTTP 200 status → `JSON.parse` crashes on `<?xml ...`.
**Fix:** Check `Content-Type` header. If not `application/json`, treat as bad mirror, rotate, retry.
**Impact:** Prevents cryptic parse errors. Graceful fallback to next mirror.

## Decision 4: Drop Primary Roads from OSM Query
**Problem:** Querying `highway=motorway|trunk|primary` for SE USA returns thousands of ways. `primary` roads alone can be 5-10x more data than motorway+trunk combined. Queries timeout at 60s.
**Fix:** Only query `highway=motorway|trunk`. These are the inter-city corridors relevant for freight hub-to-hub routing. Increased Overpass timeout from 60s to 180s.
**Rationale:** This is a Physical Internet network simulator, not a road map. Motorways and trunk roads are the logistics corridors. Primary roads (local arterials) aren't relevant for multi-tier hub network design.
**Impact:** ~5-10x less data returned, queries complete in seconds instead of minutes.

## Decision 5: Use `out geom` Instead of `out body geom`
**Problem:** `out body geom` returns full tag bodies + geometry. For road/rail queries we only need geometry and a few tags.
**Fix:** Switched to `out geom` which returns geometry without full body — lighter responses.
**Impact:** Smaller response payloads, faster parsing.
