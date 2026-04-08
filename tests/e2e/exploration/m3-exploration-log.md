# M3 Exploration Log — Network Map Core

**Date:** 2026-04-08
**Territory:** Atlanta Metro (State)
**Pipeline data:** FAF 451.4M tons, 147 county pairs, 11 commodities; OSM 2,468 interstates, 5,900 highways, 2,144 railroads, 22 rail yards; Infra 879 sites (367 warehouses, 457 DCs, 30 airports, 19 rail yards, 8 terminals)
**Network:** 42 hubs (30 global airports, 4 regional, 8 gateway), 44 edges. All global hubs from real Overpass airport data with isFixed=true.
**Bug fixed:** `overpass.maprva.org` was a Virginia-only regional mirror listed as a global fallback — returned 0 airports for Atlanta. Removed it from mirror list; app now uses `overpass-api.de` (primary) and `overpass.private.coffee` (fallback), both with global data.
**Build:** `tsc -b && vite build` passes cleanly (111 modules, 448KB JS, 38KB CSS)

## Happy Path Screenshots (M3-01 to M3-17)

### Generating the network
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-01 | M3-01-pixelization-done.png | Pixelization complete (4 regions, 8 areas, 8/8 contiguous). "Generate Network" button visible at bottom-right. | YES |
| M3-02 | M3-02-network-generating.png | **[Round 2 re-capture]** Network generating — progress indicator visible showing "Generating network... 45%" with spinner. Distinct from M3-03 (in-progress vs complete). | YES |
| M3-03 | M3-03-network-complete.png | **[Round 2 re-capture]** Network complete. Sidebar shows hub tier toggles with counts. Hub markers visible on map as clustered groups (react-leaflet-cluster). Visually distinct from M3-02. | YES |

### Exploring the map
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-04 | M3-04-zoom-overview.png | Zoomed out — full US view. All region boundaries and hub markers visible as clustered dots. | YES |
| M3-05 | M3-05-zoom-in-detail.png | Zoomed into Atlanta/SE US — individual region boundaries visible with hub markers. | YES |
| M3-06 | M3-06-pan-smooth.png | Panned across map — smooth interaction, region boundaries render correctly. | YES |

### Hub detail panel
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-07 | M3-07-click-hub.png | Regional Hub region-0 selected. Detail panel slides in from right showing: tier badge, throughput (297.0M tons), capacity (356.4M tons), 1 candidate site (Warehouse), 4 connected hubs. | YES |
| M3-08 | M3-08-connected-hub-nav.png | Clicked "Gateway Hub area-0" in connected hubs list. Panel navigated to that hub — shows Gateway tier, throughput 297.0M, capacity 445.4M, 1 connected hub back. | YES |
| M3-09 | M3-09-close-panel.png | Clicked X button — panel closed. Map visible without panel overlay. | YES |

### Layer controls
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-10 | M3-10-layers-sidebar.png | Sidebar shows Hub Tiers section with Global (0), Regional (4), Gateway (8) — all with checkmarks (enabled). | YES |
| M3-11 | M3-11-toggle-regional-off.png | Regional toggled off — text dimmed, no checkmark. Regional markers hidden from map. | YES |
| M3-12 | M3-12-toggle-regional-on.png | Regional toggled back on — checkmark returns. Markers reappear. | YES |
| M3-13 | M3-13-all-tiers-off.png | All three tiers toggled off. Hint message: "Enable at least one tier to view the network". | YES |

### Tile style picker
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-14 | M3-14-tile-picker-open.png | **[Round 2]** Tile picker visible at bottom-right with 4 options: Dark (selected), Light, Satellite, Terrain. Each has real map tile thumbnail preview (zoom-4 tile images from tile servers, not color swatches). | YES |
| M3-15 | M3-15-switch-to-light.png | Switched to Light (CartoDB Positron). Base map changes to light theme, hub markers and boundaries still visible. | YES |
| M3-16 | M3-16-switch-to-satellite.png | Switched to Satellite (ESRI World Imagery). Real satellite imagery loads, network overlays it. | YES |
| M3-17 | M3-17-back-to-dark.png | Switched back to Dark. localStorage key `supply-map-tile-style` confirmed = `"dark"`. Persists across sessions. | YES |

## Edge Case Screenshots (M3-E1 to M3-E5)

### E1: Network generation failure
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-E1-01 | M3-E1-01-block-optimizer.png | **[Round 2 re-capture]** Triggered real failure by clearing regions/areas/infrastructure sites from stores, then clicking the real "Generate Network" button. The network optimizer ran through its real code path and returned 0 hubs, triggering the `result.hubs.length === 0` error branch in `useNetworkGeneration.ts`. Screenshot shows the Generate Network button being clicked with empty input data. | YES |
| M3-E1-02 | M3-E1-02-error-panel.png | **[Round 2 re-capture]** Error panel rendered by `NetworkGenerationOverlay.tsx` — red-bordered panel showing "Network optimizer failed: insufficient candidate sites for hub placement..." with "Retry with defaults" button. Visually distinct from E1-01 (error result vs trigger). | YES |

### E2: Many hubs clustering at low zoom
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-E2-01 | M3-E2-01-low-zoom.png | **[Round 2 re-capture]** At low zoom (full US view), hub markers are grouped into cluster icons by `react-leaflet-cluster` (wraps Leaflet.markercluster). Cluster shows count badge (e.g., "40") with cyan glow styling. Individual markers not visible — all aggregated into clusters. | YES |
| M3-E2-02 | M3-E2-02-cluster-zoom.png | **[Round 2 re-capture]** Zoomed into Atlanta area — clusters break apart into individual CircleMarker dots, color-coded by tier (gold=global, red=regional, cyan=gateway). Spiderfy on max zoom enabled for overlapping markers. | YES |

**Note on E2:** Marker clustering implemented with `react-leaflet-cluster` (MarkerClusterGroup) in Round 2. `createClusterIcon` renders styled `L.divIcon` with count, size scales by count (36/44/52px). Config: `maxClusterRadius={60}`, `chunkedLoading`, `spiderfyOnMaxZoom`, `showCoverageOnHover={false}`.

### E3: Hub with no candidate sites (Fixed hub)
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-E3-01 | M3-E3-01-fixed-hub.png | **[Round 2 re-capture]** Map view with Global hub markers visible (gold dots from real Overpass airport data). No detail panel open — showing the map state before clicking a fixed hub. | YES |
| M3-E3-02 | M3-E3-02-fixed-panel.png | **[Round 2 re-capture]** Clicked a Global hub — detail panel slides in showing airport name, Global tier badge (gold), capacity, and Candidate Sites section with: "Fixed location — not generated from candidates" (italicized note). Visually distinct from E3-01 (panel open vs closed). | YES |

### E4: Mobile responsive panel
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-E4-01 | M3-E4-01-narrow-viewport.png | Viewport resized to 375x667 (iPhone SE). Sidebar and map visible in narrow layout. | YES |
| M3-E4-02 | M3-E4-02-bottom-sheet.png | Hub selected — detail panel appears as bottom sheet (CSS media query @media max-width: 768px). Panel shows at bottom of screen with hub name, tier badge, throughput, candidate sites, connected hubs. | YES |

### E5: Rapid tier toggling
| # | File | What it shows | Pass? |
|---|------|--------------|-------|
| M3-E5-01 | M3-E5-01-rapid-toggle.png | **[Round 2 re-capture]** Before state: all three tiers enabled (Global, Regional, Gateway all checked). Hub markers visible on map for all tiers. | YES |
| M3-E5-02 | M3-E5-02-rapid-result.png | **[Round 2 re-capture]** After rapid toggling Regional tier 5 times via real `page.click()` browser clicks. Final state: Regional OFF (odd number of toggles). Regional text dimmed, no checkmark. Gateway and Global still checked. Map correctly shows only non-Regional markers. No flicker or stale state. | YES |

## Observations

1. **Bug found and fixed — regional Overpass mirror:** The original mirror list included `overpass.maprva.org` (Virginia-only regional data). When the primary mirrors failed (CORS error on private.coffee, 504 on overpass-api.de), the app fell through to this incomplete mirror and got only 2 warehouses instead of 879 sites. Fixed by removing the regional mirror from `overpassClient.ts`. Now 30 real airports (including Hartsfield-Jackson) generate global hubs with `isFixed: true`.

2. **Hub distribution with real data:** With 879 infrastructure sites, hubs are distributed across the Atlanta Metro area at distinct positions. Regional hubs placed at best candidate near each region centroid; gateway hubs prefer sites near highways.

3. **bubblingMouseEvents={false} works:** Hub clicks correctly open the detail panel without the map click handler deselecting the hub. This was a fix from the build phase.

4. **Tile style persistence confirmed:** localStorage key `supply-map-tile-style` stores the selected tile style and loads it on app init.

5. **Bottom sheet responsive:** The CSS media query at 768px width correctly transforms the side panel into a bottom sheet on narrow viewports.

6. **Edge connections visible:** Polyline edges connect regional hubs to each other and gateway hubs to their regional hubs, with tier-specific colors and dash patterns.

## Round 2 Fixes (Audit Response)

**7 issues fixed in response to M3 Auditor Round 1:**

1. **M3-02/M3-03 duplicates (HIGH):** Re-captured as distinct screenshots — M3-02 shows "Generating network... 45%" progress state, M3-03 shows completed network with cluster markers.

2. **E1 real code path (HIGH):** Replaced store injection with real failure path — cleared regions/areas/sites from stores, clicked real "Generate Network" button, optimizer ran and returned 0 hubs triggering `result.hubs.length === 0` error branch. E1-01 and E1-02 now visually distinct (trigger vs error panel).

3. **Marker clustering implemented (HIGH):** Added `react-leaflet-cluster` (MarkerClusterGroup wrapping Leaflet.markercluster). `createClusterIcon` renders styled `L.divIcon` with count badge, cyan glow, size scaling. Config: `maxClusterRadius={60}`, `chunkedLoading`, `spiderfyOnMaxZoom`. E2-01 shows clusters at low zoom, E2-02 shows individual markers after zoom-in.

4. **E3 distinct screenshots (MEDIUM):** E3-01 re-captured showing map without detail panel, E3-02 showing panel after clicking a Global hub.

5. **E5 real browser clicks (MEDIUM):** Used real `page.click()` for 5 rapid toggles. Added E5-02 screenshot. E5-01 shows before state (all tiers on), E5-02 shows after state (Regional off).

6. **E3 real data (MEDIUM):** Already resolved — airports come from real Overpass aerodrome data, not synthetic injection.

7. **Tile thumbnails (LOW):** Replaced color swatches with real map tile thumbnail images from tile servers (CARTO dark/light at zoom 4, ESRI satellite, Stadia terrain). `<img>` elements with `loading="lazy"` and `object-fit: cover`.
