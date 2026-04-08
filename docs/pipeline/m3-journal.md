# Milestone 3 — Agent Journal

## Timeline
- **Started:** 2026-04-08 ~15:00
- **Builder dispatched:** M3 Network Map Core — 6 tasks (T-017 to T-022)
- **Build completed:** All 6 tasks implemented, `tsc -b && vite build` passes
- **Exploration completed:** 26/26 screenshots captured

## Builder Summary
- Stories: T-017 (Network Optimizer), T-018 (Hub Marker Layer), T-019 (Edge Layer), T-020 (Hub Tier Toggles), T-021 (Hub Detail Panel), T-022 (Tile Style Picker)
- New files created: 11
  - `src/services/networkOptimizer.ts` — hub placement algorithm (global/regional/gateway)
  - `src/hooks/useNetworkGeneration.ts` — hook wrapping generateNetwork with store integration
  - `src/components/Map/HubMarkerLayer.tsx` — CircleMarker per hub, color-coded by tier
  - `src/components/Map/EdgeLayer.tsx` — Polyline edges with tier-specific styling
  - `src/components/Layers/LayerControls.tsx` — container for tier toggles
  - `src/components/Layers/HubTierToggles.tsx` — 3 toggle buttons with counts
  - `src/components/Layers/Layers.module.css` — toggle styles
  - `src/components/HubDetail/HubDetailPanel.tsx` — slide-out right panel / bottom sheet
  - `src/components/HubDetail/HubDetail.module.css` — panel styles
  - `src/components/Map/TileStylePicker.tsx` — 4 radio buttons for tile styles
  - `src/components/Map/TileLayerSwitcher.tsx` — renders TileLayer from mapStore
- Modified files: 6
  - `src/stores/networkStore.ts` — added hub/edge/tier state + actions
  - `src/stores/mapStore.ts` — new store for tile style with localStorage
  - `src/components/Map/MapView.tsx` — integrated all new layers + MapClickHandler
  - `src/components/Sidebar/Sidebar.tsx` — added network-map screen
  - `src/components/AppShell/AppShell.tsx` — added HubDetailPanel
  - `src/App.tsx` — exposed mapStore on window for testing
- Pre-existing fixes: removed unused imports/variables in BoundaryLayer, SiteMarkerLayer, osmService, clusteringEngine
- Type declarations: `src/skmeans.d.ts` for skmeans module
- Bugs found during exploration: 1 (regional Overpass mirror returning incomplete data)
- Screenshots: 26 (17 happy path + 9 edge cases)

## Key Implementation Details
- **Hub placement:** Global hubs from ports/airports (isFixed=true), Regional one per region at nearest candidate, Gateway one per area preferring highway-adjacent sites
- **Edge generation:** Global-regional, regional-regional (within 440km/5.5h), gateway-to-same-region-regional
- **bubblingMouseEvents={false}:** Prevents map click from deselecting hub when clicking a marker
- **MapClickHandler:** Uses useMapEvents hook (react-leaflet v5) instead of MapContainer eventHandlers prop
- **Tile persistence:** localStorage key `supply-map-tile-style`, loaded on init

## Bug Found & Fixed
**Regional Overpass mirror returning incomplete data:** `overpass.maprva.org` was listed as a global fallback mirror in `overpassClient.ts`, but it is actually a Virginia-only regional instance with incomplete data. When the first two mirrors failed (CORS on private.coffee, 504 on overpass-api.de), the app fell through to this mirror and received only 2 warehouse elements instead of 879 sites (367 warehouses, 457 DCs, 30 airports, 19 rail yards, 8 terminals). **Fix:** Removed `overpass.maprva.org` from the mirror list. Reordered to use `overpass-api.de` (global, primary) and `overpass.private.coffee` (global, no rate limits, fallback). After fix: 30 real airports including Hartsfield-Jackson generate global hubs with `isFixed: true`. E3 screenshots re-captured with real pipeline data.

## Observations
1. With real infra data (879 sites), hubs are distributed across Atlanta Metro at distinct positions
2. 30 airports in Atlanta Metro generate 30 global hubs, all with isFixed=true
3. Marker clustering implemented in Round 2 with `react-leaflet-cluster` (MarkerClusterGroup)
4. Overpass API can be slow/unreliable — mirror rotation is essential for resilience

## Builder Fix Summary — Round 2

**Trigger:** M3 Auditor found 7 issues (3 HIGH, 3 MEDIUM, 1 LOW). All fixed.

### Code Changes
| File | Change |
|------|--------|
| `src/components/Map/HubMarkerLayer.tsx` | Added `MarkerClusterGroup` from `react-leaflet-cluster`, `createClusterIcon` with styled `L.divIcon` (count badge, cyan glow, size scaling 36/44/52px). Wraps all `HubMarker` components. |
| `src/components/Map/TileStylePicker.tsx` | Replaced color swatch `<div>` with `<img>` elements loading real tile server thumbnails at zoom 4. URLs: CARTO dark/light, ESRI satellite, Stadia terrain. |
| `src/components/Map/Map.module.css` | Added `object-fit: cover; display: block` to `.tilePreview` for proper img rendering. |

### Screenshot Re-captures (11 files)
| Screenshot | What changed |
|-----------|-------------|
| M3-02 | Now shows "Generating network... 45%" progress (was byte-identical to M3-03) |
| M3-03 | Now shows completed network with cluster markers (distinct from M3-02) |
| M3-E1-01 | Real failure trigger — cleared stores, clicked Generate Network button |
| M3-E1-02 | Error panel result — visually distinct from E1-01 |
| M3-E2-01 | Cluster icons at low zoom (was overlapping individual markers) |
| M3-E2-02 | Clusters broken apart at high zoom into individual markers |
| M3-E3-01 | Map view without detail panel (was near-identical to E3-02) |
| M3-E3-02 | Detail panel open showing Fixed location note |
| M3-E5-01 | Before state — all tiers enabled |
| M3-E5-02 | **New** — after 5 rapid `page.click()` toggles, Regional OFF |
| M3-14 | Tile picker with real thumbnail images (was color swatches) |

### Build Verification
- `tsc -b && vite build`: 111 modules, 448KB JS, 38KB CSS — passes cleanly
- `vitest run`: 110 tests across 9 files — all pass
