# Replace Overpass Road/Rail with BTS ArcGIS FeatureServer

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragile Overpass API for US road/rail data with the free, no-auth, no-rate-limit BTS ArcGIS FeatureServer — eliminating 429/403 errors and reducing load time from 5-20 minutes to under 30 seconds.

**Architecture:** New `btsService.ts` queries three BTS FeatureServer endpoints (highways, rail lines, rail yards) by bounding box, returning data in the same `RoadSegment`/`RailSegment` format the app already uses. `osmService.ts` delegates road/rail to BTS, keeping Overpass only for infrastructure sites. The chunking, mirror rotation, and serial queue become irrelevant for road/rail. Road+Rail data loads in parallel (two concurrent fetches) since BTS has no rate limits.

**Tech Stack:** fetch API, ArcGIS REST API (GeoJSON format), existing TypeScript types

## BTS API Reference

All endpoints are free, no API key, no rate limits, return GeoJSON.

| Dataset | Endpoint | Key Fields |
|---------|----------|------------|
| US Highways | `https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Network/FeatureServer/0/query` | `SIGNT1` (I/U/S = Interstate/US/State), `SIGN1` (e.g. "I10"), `MILES`, `AADT` |
| US Rail Lines | `https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query` | `RROWNER1` (NS/CSXT/BNSF/UP), `KM`, `STRACNET`, `TRACKS` |
| US Rail Yards | `https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/NTAD_Rail_Yards/FeatureServer/0/query` | `YARDNAME`, `RROWNER1`, `RROWNER1_NAME` |

**Pagination:** `maxRecordCount` is 2000. Use `resultOffset` to page. Texas full bbox = ~43K highway features, so pagination is required. Filter with `where=SIGNT1 IN ('I','U')` to get only Interstates + US routes (~2K-5K features for a megaregion).

**Query pattern:**
```
?where=SIGNT1 IN ('I','U')
&geometry={west},{south},{east},{north}
&geometryType=esriGeometryEnvelope
&spatialRel=esriSpatialRelIntersects
&outFields=SIGNT1,SIGN1,SIGNN1,MILES
&f=geojson
&resultRecordCount=2000
&resultOffset=0
```

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/btsService.ts` | CREATE | BTS FeatureServer client: fetch highways, rail lines, rail yards by bbox with pagination |
| `src/services/osmService.ts` | MODIFY | Remove road/rail Overpass logic, delegate to btsService. Keep `loadOSMData` signature but rename conceptually. Remove `chunkBbox`, `fetchRoads`, `fetchRail` |
| `src/hooks/usePipeline.ts` | MODIFY | Update comments, remove chunk callbacks, run roads+rail in parallel, simplify progress |
| `src/stores/pipelineStore.ts` | MODIFY | Remove `totalChunks`/`currentChunk` from OSMState (no longer needed) |
| `src/components/DataPipeline/OSMPanel.tsx` | MODIFY | Remove chunk progress UI, update copy to say "BTS" not "OpenStreetMap", simplify loading state |
| `src/services/overpassClient.ts` | KEEP | Still used by `infrastructureService.ts` — no changes |
| `src/services/infrastructureService.ts` | KEEP | Still uses Overpass — no changes |

---

## Chunk 1: BTS Service + OSM Service Rewrite

### Task 1: Create btsService.ts

**Files:**
- Create: `src/services/btsService.ts`

- [ ] **Step 1: Create the BTS service with paginated fetch helper**

```typescript
// src/services/btsService.ts
import type { RoadSegment, RailSegment } from './osmService.ts'

const BTS_HIGHWAYS_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Network/FeatureServer/0/query'
const BTS_RAIL_LINES_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_North_American_Rail_Network_Lines/FeatureServer/0/query'
const BTS_RAIL_YARDS_URL =
  'https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/NTAD_Rail_Yards/FeatureServer/0/query'

const PAGE_SIZE = 2000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  properties?: { exceededTransferLimit?: boolean }
  features: Array<{
    type: 'Feature'
    geometry: { type: string; coordinates: number[][] | number[][][] }
    properties: Record<string, unknown>
  }>
}

/**
 * Fetch all features from a BTS ArcGIS FeatureServer endpoint with pagination.
 * Retries on network errors. No rate limits on BTS servers.
 */
async function fetchAllFeatures(
  baseUrl: string,
  where: string,
  bbox: [number, number, number, number], // [west, south, east, north]
  outFields: string,
  onProgress?: (fetched: number) => void
): Promise<GeoJSONFeatureCollection['features']> {
  const [west, south, east, north] = bbox
  const allFeatures: GeoJSONFeatureCollection['features'] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      where,
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields,
      f: 'geojson',
      resultRecordCount: String(PAGE_SIZE),
      resultOffset: String(offset),
    })

    let response: Response | null = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetch(`${baseUrl}?${params}`)
        if (response.ok) break
      } catch {
        if (attempt === MAX_RETRIES) throw new Error(`BTS API unreachable after ${MAX_RETRIES} retries`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }

    if (!response || !response.ok) {
      throw new Error(`BTS API error: ${response?.status ?? 'no response'}`)
    }

    const data: GeoJSONFeatureCollection = await response.json()
    allFeatures.push(...data.features)
    onProgress?.(allFeatures.length)

    // ArcGIS sets exceededTransferLimit when there are more pages
    if (data.properties?.exceededTransferLimit && data.features.length === PAGE_SIZE) {
      offset += PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return allFeatures
}

// ---------------------------------------------------------------------------
// Line length helper (haversine on coordinates)
// ---------------------------------------------------------------------------

function lineStringLengthKm(coords: number[][]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1]
    const [lon2, lat2] = coords[i]
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch US highway segments from BTS National Network.
 * Filters to Interstates (I) and US Routes (U) only.
 */
export async function fetchBTSHighways(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RoadSegment[]> {
  const features = await fetchAllFeatures(
    BTS_HIGHWAYS_URL,
    "SIGNT1 IN ('I','U')",
    bbox,
    'SIGNT1,SIGN1,SIGNN1,MILES',
    onProgress
  )

  return features
    .filter((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
    .map((f) => {
      const props = f.properties
      const signt = String(props.SIGNT1 ?? '')
      const sign = String(props.SIGN1 ?? '')

      let type: 'interstate' | 'highway' | 'trunk'
      if (signt === 'I') type = 'interstate'
      else if (signt === 'U') type = 'highway'
      else type = 'trunk'

      // Flatten MultiLineString to first LineString
      const coords =
        f.geometry.type === 'MultiLineString'
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][])

      return {
        id: `bts-hw/${props.OBJECTID ?? Math.random()}`,
        type,
        geometry: { type: 'LineString' as const, coordinates: coords },
        ref: sign.trim() || `${signt}${props.SIGNN1 ?? ''}`,
        lengthKm: Number(props.MILES ?? 0) * 1.60934, // miles to km
      }
    })
}

/**
 * Fetch US rail line segments from BTS North American Rail Network.
 */
export async function fetchBTSRailLines(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RailSegment[]> {
  const features = await fetchAllFeatures(
    BTS_RAIL_LINES_URL,
    "COUNTRY='US'",
    bbox,
    'RROWNER1,KM,STRACNET,FRAARCID',
    onProgress
  )

  return features
    .filter((f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString')
    .map((f) => {
      const props = f.properties
      const coords =
        f.geometry.type === 'MultiLineString'
          ? (f.geometry.coordinates as number[][][])[0]
          : (f.geometry.coordinates as number[][])

      return {
        id: `bts-rail/${props.FRAARCID ?? props.OBJECTID ?? Math.random()}`,
        type: 'railroad' as const,
        geometry: { type: 'LineString' as const, coordinates: coords },
        operator: String(props.RROWNER1 ?? ''),
        lengthKm: Number(props.KM ?? 0),
      }
    })
}

/**
 * Fetch US rail yards from BTS Rail Yards dataset.
 */
export async function fetchBTSRailYards(
  bbox: [number, number, number, number],
  onProgress?: (fetched: number) => void
): Promise<RailSegment[]> {
  const features = await fetchAllFeatures(
    BTS_RAIL_YARDS_URL,
    '1=1',
    bbox,
    'YARDNAME,RROWNER1,RROWNER1_NAME',
    onProgress
  )

  return features
    .filter((f) => f.geometry.type === 'LineString' || f.geometry.type === 'Point' || f.geometry.type === 'MultiLineString')
    .map((f) => {
      const props = f.properties
      // Rail yards can be LineString (track geometry) or Point
      const geom = f.geometry.type === 'Point'
        ? { type: 'Point' as const, coordinates: f.geometry.coordinates as number[] }
        : {
            type: 'LineString' as const,
            coordinates: f.geometry.type === 'MultiLineString'
              ? (f.geometry.coordinates as number[][][])[0]
              : (f.geometry.coordinates as number[][]),
          }

      return {
        id: `bts-yard/${props.OBJECTID ?? Math.random()}`,
        type: 'rail_yard' as const,
        geometry: geom as RailSegment['geometry'],
        operator: String(props.RROWNER1_NAME ?? props.RROWNER1 ?? ''),
        lengthKm: 0,
      }
    })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:/Users/ahunt/projects/supply-map-simulator && npx tsc --noEmit src/services/btsService.ts`
Expected: No errors (or only import-related since it's standalone).

- [ ] **Step 3: Commit**

```bash
git add src/services/btsService.ts
git commit -m "feat: add BTS ArcGIS FeatureServer client for road/rail data"
```

---

### Task 2: Rewrite osmService.ts to use BTS

**Files:**
- Modify: `src/services/osmService.ts`

The key change: `loadOSMData` now calls `fetchBTSHighways`, `fetchBTSRailLines`, and `fetchBTSRailYards` in parallel instead of chunked Overpass queries.

- [ ] **Step 1: Replace loadOSMData internals**

Replace everything from the `let failedChunks = 0` line through the `return { ... }` at the end of `loadOSMData` with:

```typescript
  // --- BTS FeatureServer: roads + rail in parallel (no rate limits, no chunking) ---
  let roadsFailed = false
  let railFailed = false

  const [roadResult, railLineResult, railYardResult] = await Promise.allSettled([
    fetchBTSHighways(bbox, (count) => {
      onRoadProgress(Math.min(90, Math.round(count / 20)))
    }),
    fetchBTSRailLines(bbox, (count) => {
      onRailProgress(Math.min(80, Math.round(count / 30)))
    }),
    fetchBTSRailYards(bbox),
  ])

  // Process roads
  if (roadResult.status === 'fulfilled') {
    for (const seg of roadResult.value) {
      roadSegments.push(seg)
      totalRoadKm += seg.lengthKm
      if (seg.type === 'interstate') interstateCount++
      else highwayCount++
    }
  } else {
    roadsFailed = true
    console.warn('BTS highway fetch failed:', roadResult.reason)
  }
  onRoadProgress(100)

  // Process rail lines
  if (railLineResult.status === 'fulfilled') {
    for (const seg of railLineResult.value) {
      railSegments.push(seg)
      railroadCount++
      totalRailKm += seg.lengthKm
    }
  } else {
    railFailed = true
    console.warn('BTS rail lines fetch failed:', railLineResult.reason)
  }

  // Process rail yards
  if (railYardResult.status === 'fulfilled') {
    for (const seg of railYardResult.value) {
      railSegments.push(seg)
      yardCount++
    }
  } else {
    console.warn('BTS rail yards fetch failed:', railYardResult.reason)
  }
  onRailProgress(100)

  const failedChunks = (roadsFailed ? 1 : 0) + (railFailed ? 1 : 0)

  return {
    interstateCount,
    highwayCount,
    railroadCount,
    yardCount,
    totalRoadKm: Math.round(totalRoadKm),
    totalRailKm: Math.round(totalRailKm),
    skippedCount,
    totalChunks: 1,
    failedChunks,
    roadSegments,
    railSegments,
  }
```

- [ ] **Step 2: Update imports at top of osmService.ts**

Add: `import { fetchBTSHighways, fetchBTSRailLines, fetchBTSRailYards } from './btsService.ts'`
Remove: `import { queryOverpass } from './overpassClient.ts'`

- [ ] **Step 3: Remove dead code from osmService.ts**

Delete these functions that are no longer used:
- `chunkBbox` (and the `export { chunkBbox }` line)
- `fetchRoads` (async generator)
- `fetchRail` (async generator)
- `wayToLineString`
- `lineStringLengthKm`
- `classifyRoad`
- The `MAX_BBOX_AREA` constant
- The `OverpassBbox` type

Keep: `RoadSegment`, `RailSegment`, `OSMLoadResult` types, `loadOSMData`, `estimateLoadingTime`.

- [ ] **Step 4: Update estimateLoadingTime**

Replace the estimate function body with a simple fast estimate since BTS is fast:

```typescript
export function estimateLoadingTime(bbox: [number, number, number, number]): {
  chunks: number
  queries: number
  estimatedSeconds: number
  estimatedLabel: string
} {
  // BTS FeatureServer: 3 parallel queries (highways, rail lines, rail yards)
  // + 1 Overpass query for infrastructure sites
  // Each BTS query takes 2-10s, infra takes ~30s
  return {
    chunks: 1,
    queries: 4,
    estimatedSeconds: 40,
    estimatedLabel: '~40s',
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npx tsc -b && npx vite build`
Expected: Build passes.

- [ ] **Step 6: Commit**

```bash
git add src/services/osmService.ts
git commit -m "feat: replace Overpass road/rail with BTS FeatureServer — parallel, no rate limits"
```

---

### Task 3: Update pipeline hook and store

**Files:**
- Modify: `src/hooks/usePipeline.ts`
- Modify: `src/stores/pipelineStore.ts`

- [ ] **Step 1: Simplify usePipeline.ts**

Update the OSM section comment and remove chunk callback:

```typescript
    // --- Road & Rail from BTS (fast, no rate limits) ---
    setOSM({ status: 'loading', roadProgress: 0, railProgress: 0 })
    try {
      const osmResult = await loadOSMData(
        selectedTerritory.bbox,
        (progress) => setOSM({ roadProgress: progress }),
        (progress) => setOSM({ railProgress: progress })
      )
      // ... rest stays the same (hasData/hasFailures logic)
```

Remove the `onChunkInfo` callback argument (4th param) from the `loadOSMData` call.

Update the error message string from "Overpass API rate limited" to "BTS API unreachable":

```typescript
      if (hasFailures && hasData) {
        status = 'partial'
        errorMessage = `Some BTS data queries failed. Showing partial road/rail data.`
      } else if (hasFailures && !hasData) {
        status = 'error'
        errorMessage = `BTS transportation data unavailable. Try again in a moment.`
      }
```

- [ ] **Step 2: Remove totalChunks/currentChunk from pipelineStore OSMState**

In `pipelineStore.ts`, remove from `OSMState` interface:
- `totalChunks: number`
- `currentChunk: number`

Remove from `initialOSM`:
- `totalChunks: 1`
- `currentChunk: 0`

- [ ] **Step 3: Update loadOSMData signature**

In `osmService.ts`, remove the `onChunkInfo` parameter from `loadOSMData`:

```typescript
export async function loadOSMData(
  bbox: [number, number, number, number],
  onRoadProgress: (progress: number) => void,
  onRailProgress: (progress: number) => void,
): Promise<OSMLoadResult> {
```

Also remove `totalChunks` from `OSMLoadResult` interface (keep `failedChunks`).

- [ ] **Step 4: Verify build**

Run: `npx tsc -b && npx vite build`
Expected: Build passes.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePipeline.ts src/stores/pipelineStore.ts src/services/osmService.ts
git commit -m "chore: remove chunk tracking from pipeline — BTS doesn't need it"
```

---

### Task 4: Update OSM Panel UI

**Files:**
- Modify: `src/components/DataPipeline/OSMPanel.tsx`

- [ ] **Step 1: Remove chunk props and chunk UI**

Remove from `OSMPanelProps`:
- `totalChunks?: number`
- `currentChunk?: number`

Remove the chunk progress JSX block:
```tsx
{status === 'loading' && totalChunks > 1 && ( ... )}
```

Remove the chunk complete JSX block:
```tsx
{(status === 'complete' || status === 'partial') && totalChunks > 1 && ( ... )}
```

- [ ] **Step 2: Update loading text**

Change the loading description from:
```
Loading road & rail network from OpenStreetMap...
```
to:
```
Loading road & rail network from BTS National Transportation Database...
```

Change the estimated time text from "2-4 minutes" to "usually under 30 seconds".

Remove `estimatedLabel` prop usage (or keep it but it will say "~40s").

- [ ] **Step 3: Update the panel title hint**

Change the `title` attribute on the `?` hint from mentioning "OpenStreetMap Overpass API" to:
```
US DOT Bureau of Transportation Statistics provides official highway and railroad data for the selected territory
```

- [ ] **Step 4: Remove chunk-related props from DataPipelineDashboard.tsx**

Find where `OSMPanel` is rendered in `DataPipelineDashboard.tsx` and remove the `totalChunks` and `currentChunk` props.

- [ ] **Step 5: Verify build**

Run: `npx tsc -b && npx vite build`
Expected: Build passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/DataPipeline/OSMPanel.tsx src/components/DataPipeline/DataPipelineDashboard.tsx
git commit -m "feat: update OSM panel UI for BTS data source — faster, no chunks"
```

---

### Task 5: Verify end-to-end and push

- [ ] **Step 1: Run unit tests**

Run: `npx vitest run`
Expected: All pass (or update any tests that reference Overpass/chunking for road/rail).

- [ ] **Step 2: Build for production**

Run: `npx vite build`
Expected: Build passes.

- [ ] **Step 3: Manual smoke test**

Start dev server (`npx vite --port 5199`), search "Atlanta Metro", start pipeline:
- FAF should load instantly (bundled)
- Road & Rail should complete in ~10-30 seconds (BTS)
- Infrastructure should load after (Overpass, single query)
- No 429/403 errors for road/rail

- [ ] **Step 4: Push and verify deploy**

```bash
git push origin main
```

Verify Vercel auto-deploys and the live site works.
