# Milestone 1 — Use Case Document

## Preconditions
- App running at localhost or deployed to Vercel
- Browser with network access (Overpass API needs to be reachable)

---

## US-1.1 — Territory Search & Selection

### Happy path
1. Open app → sidebar shows "Territory Search" heading + search input (combobox)
2. Type "US" slowly → autocomplete dropdown appears with 3+ matching territories
3. Verify: "US Southeast Megaregion" is in the list
4. Click "US Southeast Megaregion" → input shows selected territory
5. "Start Pipeline" button appears below the selection
6. Click "Start Pipeline" → sidebar transitions to "Data Pipeline" screen

### Edge cases
- **E1 — No results:** Type "zzzzz" → dropdown shows "No territories found. Try 'Southeast' or 'France'."
- **E2 — 1-char guard:** Type "U" (single character) → NO autocomplete dropdown appears (min 2 chars)
- **E3 — Keyboard nav:** Type "US", press ArrowDown to highlight first option, press Enter → territory selected
- **E4 — Escape dismisses:** Type "US", see dropdown, press Escape → dropdown closes
- **E5 — Change territory:** After starting pipeline, click "Change Territory" → returns to search screen

---

## US-1.2 — FAF Freight Data Ingestion

### Precondition
Territory selected + pipeline started (US-1.1 happy path completed)

### Happy path
1. FAF panel appears with "FAF Freight Data" header
2. Progress bar animates as data loads
3. On completion: shows "Complete" badge
4. Displays: Total Tonnage (should be in millions — real FAF5 data), County Pairs (should be 100+), Commodities (should exclude coal/gravel)
5. Values are formatted (e.g., "234.5M tons" not "234500000")

### Edge cases
- **E1 — Offline fallback:** If faf-se-usa.json fetch fails, falls back to faf-sample.json. Shows "Using offline data" warning with different color/icon
- **E2 — Skipped records:** If malformed records exist in data, shows "X records skipped" count
- **E3 — Non-SE territory:** Select a territory outside SE USA (e.g., "France") → shows "No freight data available for this territory" message

---

## US-1.3 — OSM Road/Rail Infrastructure

### Precondition
Territory selected + pipeline started

### Happy path
1. OSM panel appears with "OSM Road / Rail" header
2. TWO separate progress bars: "Road" and "Rail"
3. Both animate as Overpass API returns data (may take 10-30s for SE USA)
4. On completion: "Complete" badge
5. Displays 6 metrics: Interstates, Highways, Railroads, Rail Yards, Road km, Rail km
6. Values should be realistic for SE USA (dozens of interstates, hundreds of highways, thousands of km)

### Edge cases
- **E1 — Rate limit (429):** If Overpass returns 429, panel shows "Rate limited — retrying in Xs" with countdown timer
- **E2 — Large territory chunking:** SE USA bbox is large — service should auto-chunk into sub-bboxes (verify no timeout errors)
- **E3 — Skipped geometry:** If malformed geometry returned, shows "X elements skipped" count
- **E4 — Error + retry:** If Overpass is down, panel shows error message + "Retry" button. Clicking retry re-attempts the query
- **E5 — CORS:** Verify Overpass API is reachable from browser (no CORS block on Vercel deployment)

---

## US-1.4 — Infrastructure Sites Identification

### Precondition
Territory selected + pipeline started

### Happy path
1. Infrastructure panel appears with "Infrastructure Sites" header
2. Progress bar animates as Overpass queries run
3. On completion: "Complete" badge
4. Shows: Total Sites count, breakdown by type (Warehouses, Terminals, Dist. Centers, Ports, Airports, Rail Yards)
5. Values from real OSM data — could be dozens to hundreds of sites for SE USA

### Edge cases
- **E1 — Few sites warning:** If < 10 sites found, shows warning "Few facilities found. Consider expanding territory or lowering sqft threshold"
- **E2 — Duplicates removed:** Shows "X duplicates removed" if deduplication found nearby same-type sites
- **E3 — Skipped incomplete:** Shows "X excluded — incomplete data" for sites with no area calculable
- **E4 — Error + retry:** If Overpass fails, error message + Retry button

---

## Full Flow Integration Test

### Sequence
1. Open app fresh
2. Search "US" → select "US Southeast Megaregion" → Start Pipeline
3. All 3 panels load in parallel
4. Wait for all to complete (up to 60s for real API calls)
5. Overall Progress bar reaches 100%
6. All panels show "Complete" with real data counts
7. Click "Change Territory" → returns to search
8. Search "France" → select → Start Pipeline
9. FAF panel shows "No freight data" warning (only SE USA bundled)
10. OSM panels query Overpass for France bbox → should return data

### What to watch for
- Console errors (CORS, 429, network failures)
- Panels stuck at partial progress (API timeout)
- Unrealistic numbers (0 interstates, 0 sites)
- Progress bar not reaching 100%
- "Change Territory" not resetting panel states
