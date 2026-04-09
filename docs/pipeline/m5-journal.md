# Milestone 5 — Flow Analysis

## Builder Summary

### What was built

**T-028 Flow Routing Engine** — BFS shortest-path routing through the hub network graph. `routeFlows()` in networkOptimizer.ts takes FAF records, finds nearest origin/destination hubs, and computes shortest paths via adjacency list + BFS. Assigns commodity, volume, and path data to each FreightFlow.

**T-029 Flow Animation Layer** — Leaflet-based flow visualization using L.polyline for flow lines and L.circleMarker for animated particles. Aggregates flows per edge with volume-weighted thickness (1-8px) and color gradient (cool blue to warm orange). Tooltips show origin, destination, volume, top commodity. Particle count capped at 200 for performance.

**T-030 Corridor Analysis** — Ranked table of corridors by throughput with click-to-select highlighting. Selected corridor expands to show entry/exit hubs, total throughput, and commodity breakdown. Corridors aggregated from flow paths through adjacent hub pairs.

**T-031 Flow Filters** — Filter panel with select dropdowns for origin hub, destination hub, and commodity. Volume threshold range slider with 200ms debounce. "Clear All Filters" button, "No flows match" empty state with guidance, and live flow count display.

**T-032 Network Stats Dashboard** — Recharts horizontal bar charts for hub count and throughput by tier. Summary cards (total hubs, edges, flows). Demand balance score (0-100) using coefficient of variation of regional hub throughputs, with warning at <30. Coverage metric (% of counties within 100km of a hub). Average and max edge distance.

### New files
- `src/stores/flowStore.ts` — Zustand store for flow state: flows, filters, corridors, flowsEnabled
- `src/hooks/useFlows.ts` — Orchestrates flow computation, filtering, corridor aggregation
- `src/components/Map/FlowAnimationLayer.tsx` — Leaflet flow line + particle animation
- `src/components/FlowAnalysis/FlowFilters.tsx` — Filter dropdowns and volume slider
- `src/components/FlowAnalysis/CorridorTable.tsx` — Ranked corridor table with detail panel
- `src/components/FlowAnalysis/NetworkStatsPanel.tsx` — Stats charts and metrics
- `src/components/FlowAnalysis/FlowAnalysis.module.css` — Styles for all flow analysis components
- `src/components/Layers/FlowToggle.tsx` — Toggle button for flow visualization

### Modified files
- `src/services/networkOptimizer.ts` — Added `routeFlows()`, `buildAdjacency()`, `bfsPath()`, `findNearestHub()`
- `src/components/Map/MapView.tsx` — Added FlowAnimationLayer between EdgeLayer and HubMarkerLayer
- `src/components/Layers/LayerControls.tsx` — Added tab switcher (Layers/Flows/Stats), integrated FlowToggle, FlowFilters, CorridorTable, NetworkStatsPanel
- `package.json` — Added recharts dependency

### Exploration results
- 14 screenshots taken across 4 user stories + 1 edge case
- All features pass visual verification
- Build clean: `tsc --noEmit` with no errors
- See `tests/e2e/exploration/m5-exploration-log.md` for full details
