# Graph Report - src  (2026-04-10)

## Corpus Check
- Corpus is ~31,706 words - fits in a single context window. You may not need a graph.

## Summary
- 224 nodes � 192 edges � 74 communities detected
- Extraction: 100% EXTRACTED � 0% INFERRED � 0% AMBIGUOUS
- Token cost: 0 input � 0 output

## God Nodes (most connected - your core abstractions)
1. `generateNetwork()` - 6 edges
2. `loadFAFData()` - 5 edges
3. `elementToSite()` - 5 edges
4. `findCandidateSites()` - 5 edges
5. `queryOverpassDirect()` - 5 edges
6. `fetchAllFeatures()` - 4 edges
7. `mergedBoundary()` - 4 edges
8. `generateEdges()` - 4 edges
9. `convexHull()` - 3 edges
10. `buildAdjacencyMap()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Clustering Engine"
Cohesion: 0.2
Nodes (9): areAdjacent(), buildAdjacencyMap(), clusterAreasToRegions(), clusterCountiesToAreas(), convexHull(), mergedBoundary(), postProcess(), buildCountiesFromPipeline() (+1 more)

### Community 1 - "Infrastructure Service"
Cohesion: 0.21
Nodes (9): buildInfraQuery(), classifySiteType(), deduplicateSites(), elementToSite(), estimateWayAreaSqft(), findCandidateSites(), generateSiteName(), loadInfrastructureData() (+1 more)

### Community 2 - "Network Optimizer"
Cohesion: 0.24
Nodes (12): bfsPath(), buildAdjacency(), edgeTierFor(), generateEdges(), generateNetwork(), nextEdgeId(), nextHubId(), placeGatewayHubs() (+4 more)

### Community 3 - "FAF Freight Service"
Cohesion: 0.29
Nodes (5): fetchJSON(), filterByTerritoryBbox(), isInSEUSA(), isValidRecord(), loadFAFData()

### Community 4 - "Overpass API Client"
Cohesion: 0.39
Nodes (7): delay(), enqueue(), findAliveMirror(), markMirrorDead(), queryOverpass(), queryOverpassDirect(), rotateMirror()

### Community 5 - "OSM Road/Rail Service"
Cohesion: 0.25
Nodes (0): 

### Community 6 - "Export Service"
Cohesion: 0.33
Nodes (2): buildFlowCSV(), csvQuote()

### Community 7 - "Flow Animation Layer"
Cohesion: 0.33
Nodes (0): 

### Community 8 - "Split Map View"
Cohesion: 0.33
Nodes (0): 

### Community 9 - "Format Utilities"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "Geo Utilities"
Cohesion: 0.4
Nodes (2): haversine(), toRadians()

### Community 11 - "BTS FeatureServer"
Cohesion: 0.7
Nodes (4): fetchAllFeatures(), fetchBTSHighways(), fetchBTSRailLines(), fetchBTSRailYards()

### Community 12 - "Infrastructure Panel"
Cohesion: 0.5
Nodes (0): 

### Community 13 - "OSM Panel"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Pixelization Controls"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Error Boundary"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "FAF Panel"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "JSON Export"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Boundary Layer"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Map View Core"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "3D Projection"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Territory Input"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Split Panel Context"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Elapsed Timer"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Pipeline Store"
Cohesion: 0.67
Nodes (0): 

### Community 25 - "App Root"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "App Shell Layout"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Pipeline Dashboard"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Export Modal"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "GeoJSON Export"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Flow Filters"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Hub Detail Panel"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Flow Toggle"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Hub Tier Toggles"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Edge Layer"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Hub Marker Layer"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Infrastructure Layer"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Site Marker Layer"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Territory Boundary"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Tile Layer Switcher"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Tile Style Picker"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Pixelization Tests"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Export Hook"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Flow Analysis Hook"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Layer State Hook"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Network Generation"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Pipeline Hook"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Map Store"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Flow Store"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Network Store"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Territory Store"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Type Definitions"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Corridor Table"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Network Stats"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Boundary Toggles"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Infrastructure Toggles"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Layer Controls"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Opacity Sliders"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "CSV Export"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "PNG Export"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Network Generation Overlay"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "FAF Service Test"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "OSM Service Test"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Pipeline Store Test"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Territory Store Test"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Format Tests"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Geo Tests"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Type Index"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Main Entry"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Test Setup"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "SKMeans Types"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Clustering Types"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "County Types"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `App Root`** (2 nodes): `App.tsx`, `App()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Shell Layout`** (2 nodes): `AppShell.tsx`, `handleResize()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pipeline Dashboard`** (2 nodes): `DataPipelineDashboard.tsx`, `isDone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Export Modal`** (2 nodes): `ExportModal.tsx`, `handler()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GeoJSON Export`** (2 nodes): `GeoJSONExport.tsx`, `handleDownload()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flow Filters`** (2 nodes): `FlowFilters.tsx`, `FlowFilters()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hub Detail Panel`** (2 nodes): `HubDetailPanel.tsx`, `HubDetailPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flow Toggle`** (2 nodes): `FlowToggle.tsx`, `FlowToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hub Tier Toggles`** (2 nodes): `HubTierToggles.tsx`, `HubTierToggles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Edge Layer`** (2 nodes): `EdgeLayer.tsx`, `NetworkEdge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hub Marker Layer`** (2 nodes): `HubMarkerLayer.tsx`, `createClusterIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Infrastructure Layer`** (2 nodes): `InfrastructureLayer.tsx`, `InfrastructureLayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Site Marker Layer`** (2 nodes): `SiteMarkerLayer.tsx`, `SiteMarkerLayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Territory Boundary`** (2 nodes): `TerritoryBoundaryLayer.tsx`, `TerritoryBoundaryLayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tile Layer Switcher`** (2 nodes): `TileLayerSwitcher.tsx`, `TileLayerSwitcher()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tile Style Picker`** (2 nodes): `TileStylePicker.tsx`, `TileStylePicker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pixelization Tests`** (2 nodes): `PixelizationControls.test.tsx`, `validateParams()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar`** (2 nodes): `Sidebar.tsx`, `Sidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Export Hook`** (2 nodes): `useExport.ts`, `useExport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flow Analysis Hook`** (2 nodes): `useFlows.ts`, `useFlows()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layer State Hook`** (2 nodes): `useLayerState.ts`, `useLayerState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Network Generation`** (2 nodes): `useNetworkGeneration.ts`, `useNetworkGeneration()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pipeline Hook`** (2 nodes): `usePipeline.ts`, `usePipeline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Map Store`** (2 nodes): `mapStore.ts`, `loadPersistedTileStyle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Flow Store`** (2 nodes): `territoryStore.ts`, `territoryStore.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Network Store`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Territory Store`** (1 nodes): `skmeans.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Definitions`** (1 nodes): `test-setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Corridor Table`** (1 nodes): `CSVExport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Network Stats`** (1 nodes): `PNGExport.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Boundary Toggles`** (1 nodes): `CorridorTable.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Infrastructure Toggles`** (1 nodes): `NetworkStatsPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layer Controls`** (1 nodes): `BoundaryToggles.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Opacity Sliders`** (1 nodes): `InfrastructureToggles.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CSV Export`** (1 nodes): `LayerControls.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PNG Export`** (1 nodes): `OpacitySliders.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Network Generation Overlay`** (1 nodes): `NetworkGenerationOverlay.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FAF Service Test`** (1 nodes): `flowStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OSM Service Test`** (1 nodes): `networkStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pipeline Store Test`** (1 nodes): `area.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Territory Store Test`** (1 nodes): `clustering.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Format Tests`** (1 nodes): `county.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Geo Tests`** (1 nodes): `edge.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Index`** (1 nodes): `flow.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Main Entry`** (1 nodes): `hub.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Setup`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SKMeans Types`** (1 nodes): `region.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clustering Types`** (1 nodes): `site.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `County Types`** (1 nodes): `territory.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._