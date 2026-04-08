# Milestone 3 — Use Case: Exploring the Generated Hub Network

## Starting point
You've loaded Atlanta Metro, run the data pipeline (FAF/OSM/Infra all complete), and run space pixelization (4 regions, 8 areas). Now you want to see the generated hub network.

## Journey

### Generating the network
1. [screenshot: M3-01-pixelization-done] Pixelization is complete — you see 4 colored regions on the map. A "Generate Network" button appears.
2. [screenshot: M3-02-network-generating] Click Generate Network — the optimizer runs, placing hubs from candidate infrastructure sites. Progress indicator shows placement happening.
3. [screenshot: M3-03-network-complete] Network generation complete. The map now shows hub markers: gold for Global (ports/airports), red for Regional, cyan for Gateway. Edges connect them.

### Exploring the map
4. [screenshot: M3-04-zoom-overview] Zoom out to see the full network. Hub markers cluster at low zoom to avoid overlap. The Kepler Dark geo style gives everything a clean, professional look.
5. [screenshot: M3-05-zoom-in-detail] Zoom into the Atlanta area. Individual hub markers are visible with glow effects. Edge connections between hubs show with tier-specific colors.
6. [screenshot: M3-06-pan-smooth] Pan across the map — interactions should be smooth at 60fps even with many hubs rendered.

### Hub detail panel
7. [screenshot: M3-07-click-hub] Click a Regional hub marker. A detail panel slides in from the right showing: tier, throughput capacity, candidate sites in the cluster, and connected hubs.
8. [screenshot: M3-08-connected-hub-nav] In the detail panel, click a connected hub name. The map pans to that hub and its detail panel opens — navigating the network.
9. [screenshot: M3-09-close-panel] Click X or click the map background — the panel closes.

### Layer controls
10. [screenshot: M3-10-layers-sidebar] Open the Layers sidebar. Hub tier toggles are visible: Global, Regional, Gateway (each with their color indicator).
11. [screenshot: M3-11-toggle-regional-off] Toggle off "Regional" — all red hub markers and their edges disappear from the map.
12. [screenshot: M3-12-toggle-regional-on] Toggle Regional back on — markers and edges reappear.
13. [screenshot: M3-13-all-tiers-off] Toggle ALL tiers off — the map is empty. A hint appears: "Enable at least one tier to view the network."

### Tile style picker
14. [screenshot: M3-14-tile-picker-open] Open the tile style picker. Four options with thumbnail previews: Dark (current), Light, Satellite, Terrain.
15. [screenshot: M3-15-switch-to-light] Switch to Light (CartoDB Positron) — the base map changes but zoom/position stays the same. Hub markers are still visible.
16. [screenshot: M3-16-switch-to-satellite] Switch to Satellite — ESRI World Imagery loads. The hub network overlays real imagery.
17. [screenshot: M3-17-back-to-dark] Switch back to Dark. Reload the page — Dark persists (saved to localStorage).

## Edge cases to verify along the way

### Network generation failure
18. [screenshot: M3-E1-01-block-optimizer] Use page.route() to make the network optimizer fail (or inject an error into the optimization step)
19. [screenshot: M3-E1-02-error-panel] An error panel shows the reason with a "Retry with defaults" button

### Many hubs clustering
20. [screenshot: M3-E2-01-low-zoom] At very low zoom with 500+ gateway hubs, markers should cluster into groups to prevent overlap
21. [screenshot: M3-E2-02-cluster-zoom] Zoom in — clusters break apart into individual markers

### Hub with no candidate sites
22. [screenshot: M3-E3-01-fixed-hub] Click a Global hub (port or airport) — these are fixed locations, not generated from candidates
23. [screenshot: M3-E3-02-fixed-panel] Detail panel shows "Fixed location — not generated from candidates" instead of candidate sites list

### Mobile responsive panel
24. [screenshot: M3-E4-01-narrow-viewport] Resize viewport to < 768px width
25. [screenshot: M3-E4-02-bottom-sheet] Click a hub — detail panel appears as bottom sheet instead of side panel

### Rapid tier toggling
26. [screenshot: M3-E5-01-rapid-toggle] Rapidly toggle a tier on/off 5 times — the final state should be correct with no visual flicker or stale markers
