# Milestone 4 — Use Case: Advanced Map Views

## Starting point
Territory loaded (Texas), data pipeline complete, pixelization done (regions/areas/counties visible), network generated with Global/Regional/Gateway hubs and edges on the map. Layer controls sidebar is available with hub tier toggles.

## Journey

### Split View (US-2.5)

1. [screenshot: US-2.5-01-single-view-before-split] Single map view showing the full hub network — baseline before enabling split
2. [screenshot: US-2.5-02-split-view-enabled] Click the split view toggle — two maps appear side by side, both showing identical network state
3. [screenshot: US-2.5-03-split-sync-pan] Pan/zoom the left map — the right map syncs to the same position and zoom level
4. [screenshot: US-2.5-04-split-independent-layers] Toggle off Regional hubs on the left map — right map still shows all tiers (independent layer controls)
5. [screenshot: US-2.5-05-split-different-tiles] Switch the right map to Light tiles while left stays Dark — shows comparison use case
6. [screenshot: US-2.5-06-split-view-disabled] Disable split view — returns to single map (left map state preserved)

### 3D Tridimensional Projection (US-2.6)

7. [screenshot: US-2.6-01-2d-baseline] Standard 2D map view — baseline before enabling 3D
8. [screenshot: US-2.6-02-3d-enabled] Enable 3D projection — map tilts and hub tiers separate into vertical planes (Regional above, Gateway middle, Global base)
9. [screenshot: US-2.6-03-3d-rotated] Rotate the 3D view — perspective updates smoothly showing depth separation
10. [screenshot: US-2.6-04-3d-hub-click] Click a hub on an elevated plane — detail panel opens correctly despite perspective distortion
11. [screenshot: US-2.6-05-3d-disabled] Disable 3D — map returns to flat 2D view

### Infrastructure Overlays (US-2.7)

12. [screenshot: US-2.7-01-no-infra-overlays] Map with no infrastructure overlays enabled — just hubs and edges
13. [screenshot: US-2.7-02-highways-enabled] Toggle "Highways" on — highway lines render on the map with distinguishable styling
14. [screenshot: US-2.7-03-railroads-enabled] Toggle "Railroads" on — railroad lines appear alongside highways
15. [screenshot: US-2.7-04-ports-airports-enabled] Toggle "Ports" and "Airports" on — point markers appear at port/airport locations
16. [screenshot: US-2.7-05-all-infra-zoomed] Zoom in — line detail increases for highways and railroads
17. [screenshot: US-2.7-06-infra-satellite-contrast] Switch to Satellite tiles — infrastructure lines remain visible with adjusted contrast

### Boundary Overlays (US-2.8)

18. [screenshot: US-2.8-01-no-boundaries] Map with no boundary overlays — hubs and edges only
19. [screenshot: US-2.8-02-region-boundaries] Toggle "Region Boundaries" on — region polygon outlines appear with thicker stroke
20. [screenshot: US-2.8-03-area-boundaries] Toggle "Area Boundaries" on — area boundaries appear nested within regions
21. [screenshot: US-2.8-04-county-boundaries-zoomed] Toggle "County Boundaries" on and zoom to level 8+ — county names appear
22. [screenshot: US-2.8-05-all-boundaries-layered] All three boundary levels on — regions render on top with thickest stroke, areas middle, counties thin

### Opacity Sliders (US-2.2, US-2.7, US-2.8)

23. [screenshot: US-2.7-07-opacity-hub-reduced] Drag the Hub opacity slider to ~30% — hub markers become semi-transparent
24. [screenshot: US-2.7-08-opacity-infra-reduced] Drag the Infrastructure opacity slider to ~50% — infrastructure lines fade
25. [screenshot: US-2.8-06-opacity-boundary-reduced] Drag the Boundary opacity slider to ~40% — boundaries become subtle
26. [screenshot: US-2.8-07-opacity-combined] All three opacity sliders adjusted — shows layered transparency effect

## Edge cases to verify along the way

- [screenshot: US-2.5-E1-01-narrow-viewport] Resize browser to <1024px width — split view stacks vertically
- [screenshot: US-2.5-E1-02-narrow-stacked] Stacked split view showing both maps in vertical layout
- [screenshot: US-2.5-E2-01-resize-proportional] Resize browser while split view active — both maps resize proportionally
- [screenshot: US-2.6-E1-01-no-webgl] Simulate no WebGL — message says "3D projection requires WebGL" and toggle is disabled
- [screenshot: US-2.6-E1-02-fallback-message] Close-up of the WebGL fallback message
- [screenshot: US-2.7-E1-01-no-rail-tooltip] Toggle "Railroads" in a territory with no rail data — tooltip says "No rail data in this territory"
- [screenshot: US-2.8-E1-01-boundary-disabled] Before pixelization runs — boundary toggles are disabled with tooltip "Run pixelization first"
- [screenshot: US-2.8-E3-01-split-boundary-independent] In split view, toggle boundaries on one side only — other side unaffected
