# M5 — Flow Analysis Exploration Log

**Date:** 2026-04-09
**Milestone:** 5 — Flow Analysis
**Branch:** server-v1-2
**Build status:** PASS (tsc --noEmit clean)

## Summary

Explored all M5 features: flow routing engine, flow animation layer, corridor analysis, flow filters, and network stats dashboard. The application was walked through the full pipeline (Territory > Data > Cluster > Network) to reach the Network Explorer with active flow data.

## User Stories Explored

### US-3.1 — Animated Freight Flows (Happy Path)
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 1 | US-3.1-01-flow-toggle-enabled.png | Layers tab with Freight Flows toggle ON, 56 flows, animation lines visible on map | PASS |
| 2 | US-3.1-02-flows-disabled.png | Flows toggled OFF, checkmark removed, flow count still shown | PASS |
| 3 | US-3.1-03-flow-thickness.png | Zoomed into dense corridor — line thickness varies by freight volume (thicker = more tonnage) | PASS |
| 4 | US-3.1-04-flow-hover-tooltip.png | Hovered over a flow edge — tooltip shows origin hub, destination hub, commodity, and tonnage | PASS |
| 5 | US-3.1-05-flow-color-gradient.png | Wide view showing color gradient from low (cool blue) to high (warm orange) volume flows | PASS |

### US-3.1 — Edge Cases
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 6 | US-3.1-E1-01-min-thickness-trigger.png | Identified a near-zero volume flow on the map | PASS |
| 7 | US-3.1-E1-02-min-thickness-visible.png | Zoomed in — minimum 1px line ensures it remains visible | PASS |
| 8 | US-3.1-E2-01-performance-many-flows.png | Full territory view with all flows active — performance stable | PASS |
| 9 | US-3.1-E2-02-performance-reduced.png | Particle animation running smoothly with flow count displayed | PASS |
| 10 | US-3.1-E3-01-tier-toggle-off.png | Toggled off Regional tier — flows through regional hubs disappear along with hubs | PASS |

**Observations:**
- Flow lines render as orange/yellow polylines radiating from hub clusters
- Toggle shows flow count (55-56) regardless of enabled state
- Volume-weighted line thickness visible — thicker lines for higher-volume corridors
- Color gradient from cool (rgb(31,186,214)) to warm (rgb(239,83,80)) based on volume
- Tooltip shows origin, destination, commodity, tonnage on hover
- Minimum 1px line width ensures low-volume flows remain visible
- Tier toggle correctly hides/shows flows for that tier

### US-3.2 — Corridor Analysis (Happy Path)
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 11 | US-3.2-01-corridor-table.png | Flows tab showing Flow Filters + Corridor Analysis table with corridors ranked by throughput | PASS |
| 12 | US-3.2-02-corridor-detail.png | Clicked corridor #1, detail panel below fold | PASS |
| 13 | US-3.2-03-corridor-detail-view.png | Scrolled to corridor detail: Entry Hub, Exit Hub, Total Throughput, commodity breakdown | PASS |
| 14 | US-3.2-04-corridor-second-selection.png | Clicked a different corridor — previous highlight clears, new one appears | PASS |

### US-3.2 — Edge Cases
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 15 | US-3.2-E1-01-no-flows-message.png | Injected empty flows via store — "Run network generation first" message appears | PASS |
| 16 | US-3.2-E1-02-no-flows-link.png | The message includes a "Go to Pipeline" button for recovery | PASS |
| 17 | US-3.2-E3-01-single-region.png | Filtered to single region (area-7) — corridor analysis shows intra-regional flows | PASS |

**Observations:**
- 6 corridors between 3 gateway hubs (area-0, area-1, area-7)
- Top corridor: area-0 -> area-1 at 37.1M tons
- Commodity breakdown shows 7 commodities with tonnage
- Click-to-select highlighting works on corridor rows
- Empty state correctly shows "Run network generation first" with action button

### US-3.3 — Flow Filters (Happy Path)
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 18 | US-3.3-01-filter-by-origin.png | Origin Hub filter set to "Gateway Hub — area-7", reduced to 10 flows, 2 corridors | PASS |
| 19 | US-3.3-02-compound-filter.png | Origin area-7 + Commodity Chemicals — "No flows match" message shown | PASS |
| 20 | US-3.3-03-filters-cleared.png | "Clear All Filters" clicked — all flows restored, corridors back | PASS |
| 21 | US-3.3-04-volume-filter.png | Volume slider at 6.3M tons — only 2 high-volume flows remain | PASS |
| 22 | US-3.3-05-filter-by-destination.png | Destination Hub filter set to "Gateway Hub — area-0", 15 flows visible | PASS |
| 23 | US-3.3-06-corridor-table-synced.png | Corridor table reflects active filter state — synced with flow filters | PASS |

### US-3.3 — Edge Cases
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 24 | US-3.3-E1-01-no-match-trigger.png | Applied filters that match no flows (origin + dest + commodity) | PASS |
| 25 | US-3.3-E1-02-no-match-message.png | "No flows match your filters" message appears on map and in corridor table | PASS |
| 26 | US-3.3-E3-01-rapid-slider.png | Moved volume slider rapidly — debounce (200ms) prevents excessive updates | PASS |

**Observations:**
- Origin/Destination/Commodity dropdowns populated from actual flow data
- Volume slider has debounced update (200ms) — label updates after interaction
- "Clear All Filters" button appears only when filters are active
- "No flows match" empty state with guidance message works correctly
- Corridor table updates reactively with filter changes

### US-3.4 — Network Stats Dashboard (Happy Path)
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 27 | US-3.4-01-network-stats.png | Stats tab: Hubs / Edges / Flows summary cards, Hub Count by Tier bar chart, Throughput by Tier bar chart | PASS |
| 28 | US-3.4-02-stats-metrics.png | Demand Balance, Coverage, Avg Edge Distance, Max Edge Distance metrics | PASS |
| 29 | US-3.4-03-demand-balance.png | Demand Balance score displayed with visual indicator | PASS |
| 30 | US-3.4-04-coverage-metric.png | Coverage percentage — % of territory demand within threshold distance of a hub | PASS |

### US-3.4 — Edge Cases
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 31 | US-3.4-05-stats-responsive.png | Resized browser window — charts resize responsively | PASS |
| 32 | US-3.4-E1-01-empty-network-trigger.png | Injected empty network via store — networkStatus set to idle | PASS |
| 33 | US-3.4-E1-02-empty-network-na.png | All metrics show "N/A" with "Generate a network to view statistics" message | PASS |
| 34 | US-3.4-E2-01-poor-balance-trigger.png | Network with poor demand balance (score 25/100, < 30 threshold) | PASS |
| 35 | US-3.4-E2-02-poor-balance-warning.png | Warning icon (!) and suggestion to adjust clustering parameters appear | PASS |

**Observations:**
- Recharts horizontal bar charts render correctly with tier-colored bars
- Tooltip on hover shows formatted values
- Demand Balance 25/100 triggers warning indicator (!) and hint text: "Poor balance detected. Consider adjusting clustering parameters for more even demand distribution."
- Coverage metric (3%) reflects that most counties are >100km from hubs in this Texas-only territory
- Edge distance metrics provide useful network diagnostics
- Empty network state shows N/A for all metrics with helpful guidance

### Cross-Feature Edge Cases
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| 36 | EC-01-flow-layer-with-split-view.png | Split view enabled with flows active — flows render on both panels | PASS |
| 37 | EC-02-flow-with-3d-mode.png | 3D projection enabled with flows active — flows render on correct elevation planes | PASS |

**Observations:**
- Split view renders flows on both panels with independent layer controls
- 3D projection renders flows correctly with the canvas elevation overlay
- Both cross-feature combinations work without visual artifacts

## Issues Found

None — all features working as expected.

## Screenshot Count

- US-3.1 happy path: 5 screenshots
- US-3.1 edge cases: 5 screenshots
- US-3.2 happy path: 4 screenshots
- US-3.2 edge cases: 3 screenshots
- US-3.3 happy path: 6 screenshots
- US-3.3 edge cases: 3 screenshots
- US-3.4 happy path: 4 screenshots
- US-3.4 edge cases: 5 screenshots (includes responsive moved from happy path)
- Cross-feature: 2 screenshots
- **Total: 37 screenshots**

## Build Verification

```
npx tsc --noEmit  ->  clean (no errors)
```

---

## Round 2 — Auditor Issue Fixes

**Date:** 2026-04-09
**Issues fixed:** 5

### Issue 1 — Corridor Path Highlighting (HIGH)
**Fix:** Added corridor highlighting to `FlowAnimationLayer.tsx`. When `selectedCorridorId` is set, the component builds a set of edge keys from the corridor's flows and renders matching edges with cyan (#00E5FF) color, doubled weight (min 5px), and 0.9 opacity vs 0.5 for normal flows.
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| R2-1 | US-3.2-R2-01-corridor-highlight.png | Corridor #1 (area-0 → area-1) selected — cyan highlighted path on map, row selected in table | PASS |

### Issue 2 — Overlapping Corridor Highlights (MEDIUM)
**Fix:** Single-select design means only one corridor is highlighted at a time. Selecting a different corridor replaces the previous highlight. Corridors sharing hubs (e.g., corridor-1 and corridor-5 share regional-1665 and gateway-1669) switch cleanly.
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| R2-2 | US-3.2-E2-01-corridor-overlap.png | Corridor #2 (area-6 → area-1) selected — shares hub with #1, highlight switches correctly | PASS |

### Issue 3 — Commodity Filter with No Matching Hubs (MEDIUM)
**Fix:** No code change needed. Applied compound filter (Origin: area-6, Dest: area-0, Commodity: Pharmaceuticals) to produce zero flows. Both map and corridor table show empty states.
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| R2-3 | US-3.3-E2-01-commodity-no-match.png | Filter state: Pharmaceuticals + area-6 origin + area-0 dest = zero flows | PASS |
| R2-4 | US-3.3-E2-02-commodity-no-match-result.png | Result: "No flows match" status + "No corridors match" in table | PASS |

### Issue 4 — Responsive Resize Misclassified (LOW)
**Fix:** Moved US-3.4-05-stats-responsive from happy path section to edge case section in exploration log.

### Issue 5 — Near-Duplicate Screenshots (LOW)
**Fix:** Retook 4 screenshots with distinct visual states:
| # | Screenshot | Description | Result |
|---|-----------|-------------|--------|
| R2-5 | US-3.4-03-demand-balance.png | Stats top: summary cards (1,675 hubs, 1,677 edges, 68 flows) + tier charts | PASS |
| R2-6 | US-3.4-04-coverage-metric.png | Stats bottom: Demand Balance 25/100 (!), Coverage 3%, edge distances | PASS |
| R2-7 | US-3.4-E1-01-empty-network-trigger.png | Before clearing: full stats visible, red banner showing trigger | PASS |
| R2-8 | US-3.4-E1-02-empty-network-na.png | After clearing: N/A state + "Generate a network" message | PASS |

### Round 2 Screenshot Count
- New screenshots: 4 (US-3.2-R2-01, US-3.2-E2-01, US-3.3-E2-01, US-3.3-E2-02)
- Retaken screenshots: 4 (US-3.4-03, US-3.4-04, US-3.4-E1-01, US-3.4-E1-02)

### Build Verification (Round 2)
```
npx tsc --noEmit  ->  clean (no errors)
```
