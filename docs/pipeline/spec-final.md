# Supply Map Simulator — Final Specification (Ground Truth)

**Date:** 2026-04-10
**Source:** Reconciliation of spec.md against built application
**App:** `C:/Users/ahunt/projects/supply-map-simulator/`
**Deployed:** https://supply-map-simulator.vercel.app

---

## Product Vision

A Physical Internet hyperconnected freight network designer based on the Garbers, Muthukrishnan & Montreuil (IPIC 2025) pragmatic methodology. Users select a megaregion or territory, the app ingests real freight data (FAF county-to-county flows), infrastructure data (roads, rail, ports, airports), and existing logistics sites. It runs multi-tier space pixelization (K-means clustering), places hub clusters at real candidate sites, and generates an optimized multi-tier hyperconnected logistics network — visualized on an interactive Leaflet.js map with the Kepler Dark Geo design language.

---

## Section 1: Data Pipeline

### US-1.1 — Territory Search `[UNCHANGED]`
**Story:** As a logistics planner, I can search for any territory (megaregion, country, or region) so that the system scopes the network generation to my area of interest.

**Acceptance Criteria:**
- GIVEN the app is loaded, WHEN I type in the territory search bar, THEN autocomplete suggestions appear within 300ms
- GIVEN suggestions are visible, WHEN I select a territory, THEN the mini-map highlights the selected boundary
- GIVEN a territory is selected, WHEN I click "Confirm", THEN the data pipeline begins loading for that territory
- GIVEN I have confirmed a territory, WHEN I want to change it, THEN I can click "Change Territory" to return to search

**Edge Cases:**
- US-1.1-E1: No results → "No territories found" message with suggestions
- US-1.1-E2: Fewer than 2 characters → autocomplete waits
- US-1.1-E3: Network failure → retry prompt with error reason

**Implementation:** `src/components/TerritoryInput/TerritoryInput.tsx`, `src/stores/territoryStore.ts`, `public/data/territories.json`

---

### US-1.2 — FAF Freight Data `[MODIFIED]`
**Story:** As a user, I can see FAF freight data being loaded — county-to-county annual tonnage, filtered by commodity type, with peak daily volume estimated.

**Acceptance Criteria:**
- GIVEN a territory is confirmed, WHEN the data pipeline starts, THEN the FAF panel shows a progress bar with percentage
- GIVEN FAF data is loading, WHEN records arrive, THEN the count of loaded county-to-county pairs updates in real-time
- GIVEN FAF data has loaded, WHEN loading completes, THEN the panel shows total tonnage, number of county pairs, and commodity types found
- GIVEN commodity filters exist, WHEN I toggle a commodity type, THEN the filtered tonnage total updates immediately

**Edge Cases:**
- US-1.2-E1: FAF API unreachable → "Data source unavailable" error with retry button
- US-1.2-E2: Territory has no FAF data → "No freight data available" warning
- US-1.2-E3: Navigate away and return → pipeline restarts cleanly (no stale data)

**Modification from spec:** FAF5 does not have a public real-time streaming API. Data is loaded from bundled JSON files (`faf-fallback.json`, territory-specific files) with a visible "Using offline data" banner. Territory bbox filtering applied post-load via state FIPS prefixes.

**Implementation:** `src/services/fafService.ts`, `src/components/DataPipeline/FAFPanel.tsx`, `public/data/faf-*.json`

---

### US-1.3 — Road/Rail Infrastructure `[MODIFIED]`
**Story:** As a user, I can see road/rail infrastructure loading — interstates, highways, railroads, yards.

**Acceptance Criteria:**
- GIVEN the data pipeline is active, WHEN road/rail data loads, THEN progress shows separately for roads and rail
- GIVEN roads are loading, WHEN data arrives, THEN interstate/highway counts update
- GIVEN rail is loading, WHEN data arrives, THEN railroad/yard counts update
- GIVEN all data has loaded, WHEN I view the summary, THEN I see total road km, rail km, and yard count

**Edge Cases:**
- US-1.3-E1: API rate limiting → retry with countdown
- US-1.3-E2: Large territory → chunked sub-region queries with progress
- US-1.3-E3: Malformed geometry → invalid records skipped with warning count

**Modification from spec:** Overpass API replaced with BTS ArcGIS FeatureServer (`btsService.ts`). Overpass had persistent 429/403 errors blocking the pipeline for 2+ minutes. BTS provides the same road/rail data more reliably. Highway, rail line, and rail yard queries run in parallel via `Promise.allSettled`.

**Implementation:** `src/services/btsService.ts`, `src/services/osmService.ts` (infrastructure still uses Overpass), `src/components/DataPipeline/OSMPanel.tsx`

---

### US-1.4 — Infrastructure Sites `[UNCHANGED]`
**Story:** As a user, I can see existing logistics facilities identified as potential hub locations — warehouses, terminals, DCs with 20K+ sqft.

**Acceptance Criteria:**
- GIVEN the data pipeline is active, WHEN infrastructure scanning runs, THEN candidate sites appear as markers on the mini-map
- GIVEN sites are found, WHEN loading completes, THEN a summary shows count by type (warehouse, terminal, DC) and total sqft
- GIVEN sites have loaded, WHEN I hover a site on the summary list, THEN its marker highlights on the mini-map

**Edge Cases:**
- US-1.4-E1: Fewer than 10 sites → warning to expand territory or lower sqft threshold
- US-1.4-E2: Duplicates → "X duplicates removed" note
- US-1.4-E3: Incomplete data (no sqft) → excluded + counted under "Excluded — incomplete data"

**Implementation:** `src/services/infrastructureService.ts`, `src/components/DataPipeline/InfraPanel.tsx`, `src/components/Map/SiteMarkerLayer.tsx`

---

### US-1.5 — Space Pixelization `[UNCHANGED]`
**Story:** As a user, I can watch multi-tier space pixelization: counties colored by demand, clustered into areas, then regions.

**Acceptance Criteria:**
- GIVEN all source data has loaded, WHEN pixelization starts, THEN counties are colored by freight demand on the map
- GIVEN clustering is running, WHEN areas form, THEN area boundaries animate into place with color grouping
- GIVEN areas are formed, WHEN regions form, THEN region boundaries appear at a higher level with distinct colors
- GIVEN pixelization completes, WHEN I view the result, THEN I can see counties, areas, and regions as three layers
- GIVEN pixelization is running, WHEN I click "Cancel", THEN computation stops and partial results are discarded

**Edge Cases:**
- US-1.5-E1: Zero-demand county → joins nearest area by geographic proximity
- US-1.5-E2: Non-contiguous area → post-processing reassigns disconnected fragment
- US-1.5-E3: Only 3 counties → "Too few counties" warning

**Implementation:** `src/services/clusteringEngine.ts`, `src/components/Pixelization/PixelizationControls.tsx`, `src/components/Map/BoundaryLayer.tsx`, `src/hooks/usePixelization.ts`

---

### US-1.6 — Clustering Parameters `[UNCHANGED]`
**Story:** As a user, I can adjust clustering parameters (target regions, demand balance, contiguity, compactness) and re-run.

**Acceptance Criteria:**
- GIVEN pixelization has completed, WHEN I open the parameter panel, THEN sliders show current values
- GIVEN I adjust a parameter, WHEN I click "Re-run", THEN pixelization re-executes with cached source data
- GIVEN re-run is executing, WHEN results appear, THEN the map updates without full page reload

**Edge Cases:**
- US-1.6-E1: Target regions = 1 → "Minimum 2 regions required"
- US-1.6-E2: Target regions > county count → validation error
- US-1.6-E3: Infeasible constraints → suggests relaxing weights

**Implementation:** `src/components/Pixelization/PixelizationControls.tsx`

---

## Section 2: Network Map

### US-2.1 — Hub Network on Map `[UNCHANGED]`
**Story:** As a user, I can see the full generated multi-tier hub network (Global/Regional/Gateway) on an interactive map.

**Acceptance Criteria:**
- Hubs appear color-coded by tier: Global `#F5A623`, Regional `#EF5350`, Gateway `#1FBAD6`, Local `#AB47BC`, Access `#66BB6A`
- Hub markers cluster at low zoom, expand on zoom in
- Edge connections render with tier-appropriate colors
- Smooth 60fps pan/zoom

**Edge Cases:**
- US-2.1-E1: 500+ hubs → clustering at low zoom
- US-2.1-E2: Network generation fails → error panel with "Retry with defaults"
- US-2.1-E3: Tab blur/return → map re-renders without refresh

**Implementation:** `src/services/networkOptimizer.ts`, `src/components/Map/HubMarkerLayer.tsx`, `src/components/Map/EdgeLayer.tsx`, `src/hooks/useNetworkGeneration.ts`

---

### US-2.2 — Layer Toggle `[UNCHANGED]`
**Story:** As a user, I can toggle hub tiers on/off independently using the Layers sidebar.

**Acceptance Criteria:**
- Toggle off a tier → hubs + edges for that tier disappear
- Toggle back on → reappear immediately
- Multiple tiers toggleable independently

**Edge Cases:**
- US-2.2-E1: All tiers off → "Enable at least one tier" hint
- US-2.2-E2: Toggle during animation → animation excludes that tier
- US-2.2-E3: Rapid toggle → final state applied without flicker

**Implementation:** `src/components/Layers/HubTierToggles.tsx`, `src/components/Layers/LayerControls.tsx`

---

### US-2.3 — Hub Detail Panel `[UNCHANGED]`
**Story:** As a user, I can click any hub to see detail panel: tier, throughput, candidate sites, connected hubs.

**Acceptance Criteria:**
- Click hub → slide-out panel from right
- Shows tier, throughput, capacity, candidate sites, connected hubs
- Click connected hub → map pans + panel updates
- Close on X or map click

**Edge Cases:**
- US-2.3-E1: Fixed Global hub → "Fixed location — not generated from candidates"
- US-2.3-E2: Click hub while panel open → smooth transition to new panel
- US-2.3-E3: Screen <768px → bottom sheet instead of side panel

**Implementation:** `src/components/HubDetail/HubDetailPanel.tsx`

---

### US-2.4 — Map Tile Styles `[UNCHANGED]`
**Story:** As a user, I can switch between Dark, Light, Satellite, and Terrain map tile styles.

**Acceptance Criteria:**
- Four options with thumbnail previews
- Switch preserves zoom/position
- Selection persists via localStorage

**Edge Cases:**
- US-2.4-E1: Slow tiles → loading indicator
- US-2.4-E2: Rapid switch → only final selection renders

**Implementation:** `src/components/Map/TileStylePicker.tsx`, `src/components/Map/TileLayerSwitcher.tsx`, `src/stores/mapStore.ts`

---

### US-2.5 — Split View `[MODIFIED]`
**Story:** As a user, I can enable split view to show two maps side by side for comparison.

**Acceptance Criteria:**
- Two maps side by side, synchronized zoom/pan
- Independent layer controls per side
- Disable returns to left map as single view

**Edge Cases:**
- US-2.5-E1: Viewport <1024px → vertical stack
- US-2.5-E2: Browser resize → proportional resize
- US-2.5-E3: 3D on one side → independent per side

**Modification from spec:** Comparison (right) map renders only BoundaryLayer + HubMarkerLayer (no EdgeLayer or InfrastructureLayer). Full layer stack caused 1 FPS (C2 hardening fix). Users can still compare hub positions and boundaries.

**Implementation:** `src/components/Map/SplitMapView.tsx`, `src/contexts/SplitPanelContext.tsx`, `src/hooks/useLayerState.ts`

---

### US-2.6 — 3D Projection `[UNCHANGED]`
**Story:** As a user, I can enable 3D tridimensional projection showing regional and gateway planes.

**Acceptance Criteria:**
- Map tilts, hub tiers separate into vertical planes
- Smooth rotation
- Click targeting works on elevated planes

**Edge Cases:**
- US-2.6-E1: No WebGL → "3D projection requires WebGL" message, toggle disabled
- US-2.6-E2: Performance <30fps → detail reduction offer
- US-2.6-E3: Click on elevated plane → correct targeting

**Implementation:** `src/components/Map/ThreeDProjection.tsx` (with cached coordinate projection)

---

### US-2.7 — Infrastructure Overlays `[MODIFIED]`
**Story:** As a user, I can toggle infrastructure overlays (highways, railroads, ports, airports).

**Acceptance Criteria:**
- Each layer toggles independently
- Lines contrast against all tile styles
- Detail increases on zoom

**Edge Cases:**
- US-2.7-E1: No rail data → tooltip "No rail data in this territory"
- US-2.7-E2: All layers on → "Simplify view" suggestion
- US-2.7-E3: Infrastructure visible on satellite tiles

**Modification from spec:** Individual React-Leaflet `<Polyline>` components (37,909) replaced with single `L.geoJSON` layers using `L.canvas()` renderer (C1 hardening fix). No user-facing behavioral difference.

**Implementation:** `src/components/Map/InfrastructureLayer.tsx`, `src/components/Layers/InfrastructureToggles.tsx`

---

### US-2.8 — Boundary Overlays `[UNCHANGED]`
**Story:** As a user, I can show region/area/county boundaries on the map.

**Acceptance Criteria:**
- Region, area, county boundaries toggle independently
- Region boundaries thicker, render on top
- County names at zoom level 8+
- Disabled if pixelization hasn't run

**Edge Cases:**
- US-2.8-E1: No pixelization → toggles disabled with "Run pixelization first"
- US-2.8-E2: All levels on → regions thickest, layered correctly
- US-2.8-E3: Split view → boundaries independent per side

**Implementation:** `src/components/Map/BoundaryLayer.tsx`, `src/components/Layers/BoundaryToggles.tsx`

---

## Section 3: Flow Analysis

### US-3.1 — Animated Freight Flows `[UNCHANGED]`
**Story:** As a user, I can see animated freight flows on the network with volume-weighted line thickness.

**Acceptance Criteria:**
- Animated particles along network edges
- Line thickness proportional to volume (min 1px)
- Hover tooltip: origin, destination, commodity, tonnage
- `prefers-reduced-motion` supported (H12)

**Edge Cases:**
- US-3.1-E1: Near-zero volume → min 1px visible
- US-3.1-E2: 1000+ flows → reduced animation fidelity
- US-3.1-E3: Tier toggle off → flows through that tier hidden

**Implementation:** `src/components/Map/FlowAnimationLayer.tsx`, `src/components/Layers/FlowToggle.tsx`

---

### US-3.2 — Corridor Analysis `[UNCHANGED]`
**Story:** As a user, I can identify major freight corridors with ranked table and highlighted map paths.

**Acceptance Criteria:**
- Ranked table by throughput
- Click row → corridor path highlighted on map
- Entry/exit hubs and commodity breakdown

**Edge Cases:**
- US-3.2-E1: No flows → "Run network generation first"
- US-3.2-E2: Overlapping corridors → combined thickness, blended colors
- US-3.2-E3: Single region → intra-regional flows shown

**Implementation:** `src/components/FlowAnalysis/CorridorTable.tsx`, `src/hooks/useFlows.ts`

---

### US-3.3 — Flow Filters `[UNCHANGED]`
**Story:** As a user, I can filter flows by origin, destination, commodity, and volume threshold.

**Acceptance Criteria:**
- Dropdowns for origin hub, destination hub, commodity
- Volume slider with 200ms debounce
- "Clear All" resets all filters
- Filters apply to map + corridor table

**Edge Cases:**
- US-3.3-E1: No matching flows → "No flows match your filters"
- US-3.3-E2: Commodity with no carriers → map + table empty
- US-3.3-E3: Rapid volume slider → debounced at 200ms

**Implementation:** `src/components/FlowAnalysis/FlowFilters.tsx`, `src/stores/flowStore.ts`

---

### US-3.4 — Network Stats `[UNCHANGED]`
**Story:** As a user, I can view network statistics: hubs by tier, throughput, demand balance, coverage.

**Acceptance Criteria:**
- Hub counts per tier in summary row
- Throughput bar charts per tier (Recharts, lazy-loaded)
- Demand balance score (0-100) with warning at <30
- Coverage percentage
- Responsive charts on resize

**Edge Cases:**
- US-3.4-E1: Empty network → all metrics "N/A"
- US-3.4-E2: Poor balance (<30) → warning icon + parameter suggestion
- US-3.4-E3: Window resize → charts resize without cropping

**Implementation:** `src/components/FlowAnalysis/NetworkStatsPanel.tsx` (lazy-loaded via `React.lazy`)

---

## Section 4: Export

### US-4.1 — PNG Export `[UNCHANGED]`
**Story:** As a user, I can export the map as PNG with all active layers.

**Acceptance Criteria:**
- Preview before download
- PNG includes all visible layers at current zoom/position
- Animated flows render as static lines

**Edge Cases:**
- US-4.1-E1: Split view → exports active (focused) side
- US-4.1-E2: Animated flows → static rendering
- US-4.1-E3: Satellite tiles CORS → warning to switch tile style

**Implementation:** `src/components/Export/PNGExport.tsx`, `src/services/exportService.ts` (html2canvas)

---

### US-4.2 — GeoJSON Export `[UNCHANGED]`
**Story:** As a user, I can export the full network geometry as GeoJSON.

**Acceptance Criteria:**
- Hubs as Points, edges as LineStrings, regions as Polygons
- Each feature has tier, id, and metadata properties
- Valid GeoJSON loadable in QGIS/geojson.io

**Edge Cases:**
- US-4.2-E1: Hub with no geometry → skipped with warning
- US-4.2-E2: >50MB → size warning
- US-4.2-E3: Complex boundaries → simplified coordinates

**Implementation:** `src/components/Export/GeoJSONExport.tsx`, `src/services/exportService.ts`

---

### US-4.3 — JSON Hub Data `[UNCHANGED]`
**Story:** As a user, I can export hub data as structured JSON.

**Acceptance Criteria:**
- Array of hub objects: id, name, tier, lat, lng, throughput, capacity, connectedHubIds
- Respects active tier filter
- UTF-8 encoding preserved

**Edge Cases:**
- US-4.3-E1: Null throughput → defaults to 0 with `estimated: false`
- US-4.3-E2: Tier filter applied → only filtered hubs exported
- US-4.3-E3: Unicode hub names → UTF-8 preserved

**Implementation:** `src/components/Export/JSONExport.tsx`, `src/services/exportService.ts`

---

### US-4.4 — CSV Flow Data `[UNCHANGED]`
**Story:** As a user, I can export flow data as CSV.

**Acceptance Criteria:**
- Columns: originHubId, destinationHubId, commodity, volumeTons, routeHops
- Comma-containing values properly quoted
- Respects active flow filters
- Streaming for 100K+ rows

**Edge Cases:**
- US-4.4-E1: Commodity with commas → properly quoted
- US-4.4-E2: No flows → "No flow data to export"
- US-4.4-E3: 100K+ rows → progress indicator, no browser freeze

**Implementation:** `src/components/Export/CSVExport.tsx`, `src/services/exportService.ts`

---

## Accessibility

### US-A11Y-001 — Keyboard Navigation `[MODIFIED — PARTIAL]`
Tab navigation works for all sidebar controls, modals, panels, and buttons. Hub markers on the Leaflet map are NOT keyboard-focusable (deferred M10). Arrow key navigation within layer tabs works via ARIA tablist.

### US-A11Y-002 — Focus Management `[MODIFIED — PARTIAL]`
Export modal has focus trap. Hub detail panel opens but does not announce to screen readers (deferred M11). Modal focus returns to trigger on close.

### US-A11Y-003 — Escape Key `[UNCHANGED]`
Escape closes hub detail panel, export modal, and dropdowns. Focus returns to triggering element.

### US-A11Y-004 — ARIA Labels `[MODIFIED — PARTIAL]`
Tab controls have `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`. Text contrast meets WCAG 4.5:1 (`--text-muted: #8A94A5`). Hub markers and map container lack ARIA labels (deferred M10).

---

## New Features (Added During Build/Hardening)

### US-NEW-1 — Error Boundary
As a user, if an unhandled JavaScript error occurs, I see a friendly error message with a Reload button instead of a white screen.
**Implementation:** `src/components/ErrorBoundary.tsx`, wraps `<App>` in `main.tsx`

### US-NEW-2 — BTS FeatureServer Integration
As a user, road and rail data loads reliably from BTS ArcGIS FeatureServer instead of the rate-limited Overpass API.
**Implementation:** `src/services/btsService.ts`

### US-NEW-3 — Network Generation Overlay
As a user, I see a progress overlay while the network is being generated from pixelization results.
**Implementation:** `src/components/Map/NetworkGenerationOverlay.tsx`

### US-NEW-4 — Territory Boundary Layer
As a user, I can see the boundary of my selected territory highlighted on the main map during and after data loading.
**Implementation:** `src/components/Map/TerritoryBoundaryLayer.tsx`

### US-NEW-5 — Reduced Motion Support
As a user with motion sensitivity, animations are disabled when my OS has `prefers-reduced-motion: reduce` enabled.
**Implementation:** CSS media query in `global.css` + `matchMedia` check in `FlowAnimationLayer.tsx`

---

## Removed Features

None. All 26 original user stories + 4 accessibility stories are implemented.

---

## Known Limitations (Deferred from Hardening)

| # | Issue | Severity |
|---|-------|----------|
| M4 | Page refresh loses all state (no persist middleware) | Medium |
| M10 | Map hub markers have no ARIA labels or keyboard focus | Medium |
| M11 | Hub detail panel silent to screen readers | Medium |
| M14 | No Content-Security-Policy header in production | Medium |
| M1/M5 | ThreeDProjection leaks map move handler | Medium |
| M3 | FlowAnimation per-frame DOM updates | Medium |
| Leaflet | `_leaflet_pos` TypeError on zoom transitions (cosmetic) | Low |

---

## Tech Stack (As Built)

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript (strict) |
| Bundler | Vite 5 |
| Map | Leaflet.js 1.9 + React-Leaflet 4 |
| Styling | CSS Modules + CSS Custom Properties |
| State | Zustand |
| Charts | Recharts (lazy-loaded) |
| 3D | Custom Canvas overlay |
| Clustering | skmeans (JS K-means) |
| Road/Rail Data | BTS ArcGIS FeatureServer |
| Infrastructure Data | Overpass API |
| FAF Data | Bundled JSON (FAF5) |
| Unit Tests | Vitest |
| E2E Tests | Playwright |
| Deploy | Vercel |
