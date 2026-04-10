# Decisions Log — Supply Map Simulator

Compiled from hardening journals, build journals, and git history.

---

## D-001: Overpass API → BTS FeatureServer for Road/Rail
**When:** M1 build (2026-04-08)
**Decision:** Replace Overpass API with BTS ArcGIS FeatureServer for highway and railroad data.
**Why:** Overpass API had persistent 429 rate limiting and 403 errors that blocked the data pipeline for 2+ minutes on large territories. Multiple mitigation attempts (mirror rotation, serial queries, circuit breaker, retry with backoff) all failed to provide reliable loading. BTS FeatureServer provides the same data (highway interstates/trunks, rail lines, rail yards) with pagination and no rate limiting.
**What was tried:** (1) Overpass mirror rotation across 3 mirrors — all hit 429s. (2) Serial query execution — still 429. (3) Circuit breaker pattern — recovered but with 60s+ delays. (4) Chunked sub-region queries — reduced per-query load but total time still 2+ minutes.
**What worked:** BTS ArcGIS FeatureServer with parallel pagination for highways, rail lines, and rail yards via `Promise.allSettled`. Reliable, no rate limits, same data quality.
**Files:** `src/services/btsService.ts` (new), `src/services/osmService.ts` (infrastructure still uses Overpass)

---

## D-002: Bundled FAF Data Instead of Live API
**When:** M1 build (2026-04-08)
**Decision:** Use bundled JSON files for FAF freight data instead of a live streaming API.
**Why:** FAF5 from the Bureau of Transportation Statistics doesn't have a public real-time API suitable for browser-side streaming. The dataset is published as annual releases (CSV/shapefile downloads). A bundled JSON approach with territory-specific files provides reliable data without external dependencies.
**What worked:** Pre-processed FAF5 data bundled as JSON in `public/data/`. Territory bbox filtering applied post-load using state FIPS prefixes. "Using offline data" banner shown to users.
**Files:** `src/services/fafService.ts`, `public/data/faf-fallback.json`, `public/data/faf-se-usa.json`

---

## D-003: Canvas Renderer for Infrastructure Layer
**When:** Hardening Round 1, fix C1 (2026-04-09)
**Decision:** Replace 37,909 individual React-Leaflet `<Polyline>` components with single `L.geoJSON` layers using `L.canvas()` renderer.
**Why:** With all infrastructure layers enabled (highways + railroads + ports + airports), the app dropped to 1 FPS with 1.3GB heap. Each road/rail segment was an individual React component with its own DOM element and event listeners.
**What worked:** Single `L.geoJSON` layer per infrastructure type with Canvas renderer. Roads, rail lines, rail yards, ports, airports each rendered as one GeoJSON layer. Performance restored to 60fps.
**Files:** `src/components/Map/InfrastructureLayer.tsx`

---

## D-004: Lighter Split View Rendering
**When:** Hardening Round 1, fix C2 (2026-04-09)
**Decision:** Comparison (right) map in split view renders only BoundaryLayer + HubMarkerLayer, excluding EdgeLayer and InfrastructureLayer.
**Why:** Duplicating the entire layer stack across two maps caused 1 FPS even with only hubs visible. The full layer stack (edges, infrastructure, flows) doubled DOM/Canvas load.
**What worked:** Right map limited to boundaries + hub markers. Users can compare hub positions and boundary layouts. Full layer detail available on the primary (left) map.
**Files:** `src/components/Map/SplitMapView.tsx`

---

## D-005: Error Boundary
**When:** Hardening Round 1, fix C4 (2026-04-09)
**Decision:** Add React ErrorBoundary wrapping `<App>` in main.tsx.
**Why:** Zero error boundaries in the entire codebase — any unhandled JavaScript error resulted in a white screen. During hardening fixes, cascading errors during development confirmed the risk.
**What worked:** Class component `ErrorBoundary` with `componentDidCatch`, showing error message + Reload button. Prevents white screen on any unhandled error.
**Files:** `src/components/ErrorBoundary.tsx`, `src/main.tsx`

---

## D-006: Mobile Responsive Sidebar
**When:** Hardening Round 1, fix C5 (2026-04-09)
**Decision:** Add responsive breakpoint at 640px — sidebar becomes full-width overlay with hamburger/close toggle.
**Why:** At 320px mobile width, the fixed 300px sidebar left only 20px for the map — completely unusable.
**What worked:** CSS media query at 640px: sidebar goes full-width overlay, toggle button in AppShell. Sidebar accepts `hidden` prop for mobile state.
**Files:** `src/components/Sidebar/Sidebar.module.css`, `src/components/AppShell/AppShell.module.css`, `src/components/AppShell/AppShell.tsx`, `src/components/Sidebar/Sidebar.tsx`

---

## D-007: Pipeline Store Memory Leak Fix
**When:** Hardening Round 1, fixes H1 + H5 + H9 (2026-04-09)
**Decision:** Add `resetPipeline()` call on territory change, AbortController for pipeline fetches, and `hasStarted` ref reset.
**Why:** Territory change left 186MB of GeoJSON segments in store, orphaned fetches continued running with stale data, and the `hasStarted` ref prevented re-triggering the pipeline.
**What worked:** `resetPipeline()` clears store on "Change Territory" click. AbortController aborts previous fetches. `hasStarted` ref resets when `selectedTerritory` changes.
**Files:** `src/components/DataPipeline/DataPipelineDashboard.tsx`, `src/hooks/usePipeline.ts`

---

## D-008: Lazy-Load Recharts (Code Splitting)
**When:** Hardening Round 1, fix H2 (2026-04-09)
**Decision:** Lazy-load NetworkStatsPanel via `React.lazy()` with Suspense.
**Why:** Recharts (8.3MB uncompressed) was statically imported, inflating the main bundle to 851KB. It's only used in one panel (Network Stats).
**What worked:** `React.lazy(() => import('./NetworkStatsPanel'))` in LayerControls. Main bundle dropped from 851KB to 487KB. Recharts loads as separate 344KB chunk on demand.
**Files:** `src/components/Layers/LayerControls.tsx`

---

## D-009: 3D Projection Coordinate Caching
**When:** Hardening Round 1, fix H4 (2026-04-09)
**Decision:** Cache projected hub coordinates, only reproject on map move/zoom events.
**Why:** Per-frame coordinate transforms for all hubs caused 1 FPS in 3D mode. Every animation frame was re-projecting every hub from lat/lng to screen coordinates.
**What worked:** `projectedHubs` Map cache. Reprojection only on `moveend`/`zoomend` events or when hubs array changes. Animation frames reuse cached screen positions.
**Files:** `src/components/Map/ThreeDProjection.tsx`

---

## D-010: Split View Toggle Debounce
**When:** Hardening Round 1, fix H7 (2026-04-09)
**Decision:** 500ms debounce on split view toggle, disable button during debounce.
**Why:** Rapid split view toggling caused 9+ Leaflet `_leaflet_pos` TypeErrors. The Leaflet map pane was being removed from DOM while zoom animations were in flight.
**What worked:** `debouncedSetSplit()` with 500ms delay, button disabled during debounce period. Reduced (but didn't fully eliminate) the Leaflet race condition.
**Files:** `src/components/Map/MapView.tsx`

---

## D-011: WCAG Contrast Fix
**When:** Hardening Round 1, fix H10 (2026-04-09)
**Decision:** Change `--text-muted` from `#6A7485` to `#8A94A5`.
**Why:** Original color had 3.16:1 contrast ratio against dark background, failing WCAG 1.4.3 (requires 4.5:1). Affected inactive tabs, counts, and opacity values.
**What worked:** `#8A94A5` provides ~4.7:1 contrast ratio. Visually still reads as "muted" text.
**Files:** `src/styles/variables.css`

---

## D-012: ARIA Tablist for Network Explorer
**When:** Hardening Round 1, fix H11 (2026-04-09)
**Decision:** Add proper ARIA tablist/tab/tabpanel roles to Network Explorer tab switcher.
**Why:** Layers/Flows/Stats tabs had no ARIA roles — screen readers couldn't identify them as a tab interface.
**What worked:** `role="tablist"` on container, `role="tab"` + `aria-selected` + `aria-controls` on each tab, `role="tabpanel"` + `id` + `aria-labelledby` on each panel.
**Files:** `src/components/Layers/LayerControls.tsx`

---

## D-013: Reduced Motion Support
**When:** Hardening Round 1, fix H12 (2026-04-09)
**Decision:** Honor `prefers-reduced-motion: reduce` OS preference.
**Why:** Flow particle animations and progress pulses ignored user motion sensitivity preferences — accessibility gap.
**What worked:** CSS `@media (prefers-reduced-motion: reduce)` rule disabling all CSS animations/transitions. `matchMedia` check in FlowAnimationLayer to skip particle animation loop entirely.
**Files:** `src/styles/global.css`, `src/components/Map/FlowAnimationLayer.tsx`

---

## D-014: SplitPanelContext for Independent Layer State
**When:** M4 build (2026-04-08)
**Decision:** Use React Context (`SplitPanelContext`) with per-panel `useLayerState` hook for independent layer controls in split view.
**Why:** Split view requires each map panel to have its own layer visibility, tile style, and opacity state, independent of the other panel. Global Zustand stores couldn't model per-panel state.
**What worked:** `SplitPanelContext` provides panel identity (left/right), `useLayerState` hook reads panel-specific state. Layer control components automatically scope to their panel.
**Files:** `src/contexts/SplitPanelContext.tsx`, `src/hooks/useLayerState.ts`

---

## D-015: Infrastructure Overpass Sub-Region Chunking
**When:** Hardening Round 1, fix C3 (2026-04-09)
**Decision:** Split large territory bboxes into sub-region tiles (max 4 degrees per side) for Overpass infrastructure queries, with 60s overall timeout.
**Why:** Single Overpass query for large territories (e.g., US Southeast) blocked the pipeline at 78% for 2+ minutes.
**What worked:** `splitBbox()` divides territory into manageable tiles. Failed sub-queries logged and skipped (partial results accepted). 60s overall timeout returns whatever was collected.
**Files:** `src/services/infrastructureService.ts`
