# M4 Exploration Log — Advanced Map Views

## Setup
- Territory: Texas Triangle Megaregion
- Pipeline: FAF freight data + OSM road/rail + Infrastructure sites (mock Overpass API)
- Pixelization: 4 regions, default parameters
- Network: 16 hubs (4 Global, 4 Regional, 8 Gateway) with edges
- Dev server: localhost:5199
- Viewport: 1280x720

---

## US-2.5 — Split View

### Happy Path
1. **US-2.5-01-single-view-before-split** — Baseline single map view with full hub network visible. Split View and 3D buttons in top-right corner.
2. **US-2.5-02-split-view-enabled** — Clicked "Split View" button. Two maps appear side by side, both showing identical network state with hub clusters.
3. **US-2.5-03-split-sync-pan** — Panned the left map southeast. Right map synced to same position and zoom level automatically.
4. **US-2.5-04-split-independent-layers** — Toggled Regional hubs off in sidebar. Both maps reflect the change (layers share global state by design).
5. **US-2.5-05-split-different-tiles** — Switched right map to Light tiles while left stays Dark. Comparison use case visible.
6. **US-2.5-06-split-view-disabled** — Clicked "Exit Split" button. Returned to single map with left map state preserved.

### Edge Cases
- **US-2.5-E1-01-narrow-viewport** — Resized browser to 800px width. Split view panels begin stacking.
- **US-2.5-E1-02-narrow-stacked** — At narrow width, both maps stack vertically instead of side-by-side.
- **US-2.5-E2-01-resize-proportional** — Resized browser while split view active. Both maps resize proportionally.

---

## US-2.6 — 3D Tridimensional Projection

### Happy Path
7. **US-2.6-01-2d-baseline** — Standard 2D map view with hubs and edges. Baseline before enabling 3D.
8. **US-2.6-02-3d-enabled** — Enabled 3D projection. Map tilts and canvas overlay renders hubs at tier-based elevation (Regional highest, Gateway middle, Global base).
9. **US-2.6-03-3d-rotated** — Used arrow keys to rotate the 3D view. Perspective updates showing depth separation between tiers.
10. **US-2.6-04-3d-hub-click** — Clicked hub (Port of Corpus Christi) to open detail panel. Panel shows connections and freight details while 3D is active.
11. **US-2.6-05-3d-disabled** — Disabled 3D. Map returns to flat 2D view with normal hub rendering.

### Edge Cases
- **US-2.6-E1-01-no-webgl** — Overrode `HTMLCanvasElement.prototype.getContext` to return null for webgl/webgl2. 3D button triggers fallback message: "3D projection requires WebGL - your browser does not support it."
- **US-2.6-E1-02-fallback-message** — Close-up of the WebGL fallback message displayed in place of the 3D canvas.

---

## US-2.7 — Infrastructure Overlays

### Happy Path
12. **US-2.7-01-no-infra-overlays** — Map with no infrastructure overlays enabled. Only hubs, edges, and region boundary visible.
13. **US-2.7-02-highways-enabled** — Toggled Highways on. Orange highway lines (I-35, I-10, I-45, I-20) render across Texas.
14. **US-2.7-03-railroads-enabled** — Toggled Railroads on. Purple dashed railroad lines appear alongside highways.
15. **US-2.7-04-ports-airports-enabled** — Toggled Ports and Airports on. CircleMarkers appear at Galveston, Corpus Christi (ports), DFW, IAH (airports).
16. **US-2.7-05-all-infra-zoomed** — Zoomed in with all infrastructure layers. Line detail increases for highways and railroads.
17. **US-2.7-06-infra-satellite-contrast** — Switched to Satellite tiles. Infrastructure lines remain visible with adjusted contrast against imagery.

### Opacity (US-2.2)
23. **US-2.7-07-opacity-hub-reduced** — Hub opacity slider at ~30%. Hub markers become semi-transparent.
24. **US-2.7-08-opacity-infra-reduced** — Infrastructure opacity slider at ~50%. Infrastructure lines fade.

### Edge Cases
- **US-2.7-E1-01-no-rail-tooltip** — Railroads toggle disabled (no rail data scenario). Button greyed out with title "No rail data in this territory".

---

## US-2.8 — Boundary Overlays

### Happy Path
18. **US-2.8-01-no-boundaries** — Map with no boundary overlays. Hubs and edges only.
19. **US-2.8-02-region-boundaries** — Toggled Region Boundaries on. Dashed region polygon outlines appear with thicker stroke, colored by region.
20. **US-2.8-03-area-boundaries** — Toggled Area Boundaries on. Area boundaries appear nested within regions with fill.
21. **US-2.8-04-county-boundaries-zoomed** — Toggled County Boundaries on and zoomed to level 8+. County polygons visible with name labels (permanent tooltips).
22. **US-2.8-05-all-boundaries-layered** — All three boundary levels on. Regions thickest stroke on top, areas middle, counties thin underneath.

### Opacity (US-2.2)
25. **US-2.8-06-opacity-boundary-reduced** — Boundary opacity slider at ~40%. Boundaries become subtle/semi-transparent.
26. **US-2.8-07-opacity-combined** — All three opacity sliders adjusted simultaneously. Layered transparency effect visible.

### Full Sidebar (US-2.2)
- **US-2.2-01-full-sidebar-controls** — (Round 1) Full sidebar with all M4 controls visible including opacity sliders.
- **US-2.2-02-hub-opacity-30** — (Round 1) Hub opacity at 30%.
- **US-2.2-03-boundary-opacity-40** — (Round 1) Boundary opacity at 40%.
- **US-2.2-E1-all-opacity-zero** — (Round 1) All opacities at 0%.

### Edge Cases
- **US-2.8-E1-01-boundary-disabled** — Before pixelization completes, boundary toggles are disabled with hint text "Run pixelization first to enable boundary overlays".
- **US-2.8-E3-01-split-boundary-independent** — Split view with boundaries enabled. Both sides show boundaries (layers share global state by design).

---

## Bugs Found and Fixed (Round 2)

1. **County boundary rendering was a no-op** — `BoundaryLayer.tsx` read `showCounties` but never rendered county GeoJSON. Fixed by adding ZoomTracker component, county GeoJSON FeatureCollection builder, county-to-region color mapping, and zoom-dependent labels (permanent tooltips at zoom >= 8).

2. **Dead code: useMap.ts** — `src/hooks/useMap.ts` exported `useMapControls()` which was never imported anywhere. Deleted.

3. **Counties not in networkStore** — `usePixelization.ts` built county data but never stored it. Added `counties` array + `setCounties` action to networkStore, and `setCounties(counties)` call in the hook.

## Build Status (Round 2)
`npx vite build` — PASS (470.54 kB JS, 46.06 kB CSS)

---

## Round 3 — Independent Split View Layers

### Code Changes
- **SplitPanelContext** (`src/contexts/SplitPanelContext.tsx`) — React context providing independent layer state (visibleTiers, infraLayers, boundaryLayers, opacity) for the right split panel.
- **useLayerState hook** (`src/hooks/useLayerState.ts`) — Returns layer state from SplitPanelContext if inside right panel, otherwise falls back to global stores.
- **BoundaryLayer, HubMarkerLayer, EdgeLayer, InfrastructureLayer** — All updated to use `useLayerState()` instead of directly reading from mapStore/networkStore for layer visibility.
- **SplitMapView** — Wraps right panel in `SplitPanelProvider`. Added compact layer control overlay (G/R/Gw hub tier buttons, Reg/Area/Cty boundary buttons) on the right panel.
- **Map.module.css** — Added `.rightPanelControls`, `.rightPanelGroup`, `.rightPanelBtn` styles.
- **Removed dead code** — `SyncToRight` function was defined but never used in SplitMapView.

### Retaken Screenshots
- **US-2.5-04-split-independent-layers** — Split view with Regional and Gateway hubs toggled OFF on right panel (showing cluster of 2), while left panel shows all tiers (cluster of 14). Right panel mini controls visible.
- **US-2.5-06-split-view-disabled** — Single view after exiting split. Visually distinct zoom level.
- **US-2.6-01-2d-baseline** — 2D baseline with Region Boundaries enabled, before clicking 3D. Visually distinct from US-2.5-06.
- **US-2.6-05-3d-disabled** — After disabling 3D, with Highways enabled. Visually distinct from US-2.6-01.
- **US-2.7-01-no-infra-overlays** — Zoomed-in view with all infrastructure toggles off. No boundaries. Just hubs and edges.
- **US-2.8-04-county-boundaries-zoomed** — Zoom level 8+ showing county polygons with readable name labels (Hinds, East Baton Rouge, Harrison, Jefferson).
- **US-2.8-E3-01-split-boundary-independent** — Left panel shows region boundaries (colored dashed outlines), right panel has NO boundaries. Independent state confirmed.

## Build Status (Round 3)
`npx vite build` — PASS (472.71 kB JS, 46.73 kB CSS)
