# M2 — Space Pixelization — Use Case Exploration Plan

## US-1.5 — Space Pixelization (Happy Path)

### Prerequisites
- Territory selected and confirmed (e.g., "SE USA Megaregion")
- Data pipeline complete (FAF, OSM, Infra all loaded)

### Steps
1. [screenshot: US-1.5-01-pipeline-complete.png] Pipeline dashboard shows all 3 sources complete, "Start Pixelization" button visible
2. [screenshot: US-1.5-02-pixelization-started.png] Click "Start Pixelization" → pixelization screen loads, auto-starts, shows progress bar + step indicators
3. [screenshot: US-1.5-03-clustering-progress.png] Step indicators animate: "Color counties" → "Cluster into areas" → "Group into regions"
4. [screenshot: US-1.5-04-pixelization-complete.png] Pixelization complete: results panel shows area count, region count, total demand, contiguous count
5. [screenshot: US-1.5-05-map-boundaries.png] Map shows area boundaries (thin colored) and region boundaries (thick dashed) with color coding
6. [screenshot: US-1.5-06-region-list.png] Region list shows each region with color dot, area count, and demand tonnage

### Edge Cases

#### US-1.5-E1 — County with zero demand
1. [screenshot: US-1.5-E1-01-zero-demand-territory.png] Select a territory that produces counties with zero freight demand
2. [screenshot: US-1.5-E1-02-zero-demand-assigned.png] Zero-demand county is assigned to nearest area by geographic proximity (not left unassigned)

#### US-1.5-E2 — Non-contiguous area (post-processing)
1. [screenshot: US-1.5-E2-01-run-clustering.png] Run clustering with parameters that may produce non-contiguous areas
2. [screenshot: US-1.5-E2-02-contiguous-result.png] Post-processing reassigns disconnected fragments; contiguous count = total (or shows count)

#### US-1.5-E3 — Too few counties
1. [screenshot: US-1.5-E3-01-small-territory.png] Select a very small territory with < 3 counties
2. [screenshot: US-1.5-E3-02-too-few-warning.png] Error message: "Too few counties for meaningful clustering"

#### US-1.5-E4 — Cancel during pixelization
1. [screenshot: US-1.5-E4-01-running.png] Start pixelization, observe progress
2. [screenshot: US-1.5-E4-02-cancelled.png] Click "Cancel" → status resets, partial results discarded

---

## US-1.6 — Clustering Parameters (Happy Path)

### Prerequisites
- Pixelization has completed at least once

### Steps
1. [screenshot: US-1.6-01-params-visible.png] Parameter panel visible with sliders: Target Regions, Demand Balance, Contiguity, Compactness
2. [screenshot: US-1.6-02-change-regions.png] Change Target Regions slider from default (4) to 6
3. [screenshot: US-1.6-03-rerun-complete.png] Click "Re-run Pixelization" → new results with different region count
4. [screenshot: US-1.6-04-map-updated.png] Map updates with new boundary layout (more regions = more colors)

### Edge Cases

#### US-1.6-E1 — Target regions = 1
1. [screenshot: US-1.6-E1-01-set-to-1.png] Try to set target regions slider to 1
2. [screenshot: US-1.6-E1-02-validation-error.png] Slider min is 2, so can't go below; if manually forced, validation says "Minimum 2 regions required"

#### US-1.6-E2 — Target regions > county count
1. [screenshot: US-1.6-E2-01-high-regions.png] Set target regions to a high number (e.g., 20)
2. [screenshot: US-1.6-E2-02-capped-result.png] Re-run succeeds but actual region count is capped at available data

#### US-1.6-E3 — Re-run uses cached data (no re-fetch)
1. [screenshot: US-1.6-E3-01-adjust-params.png] Adjust parameters after first run
2. [screenshot: US-1.6-E3-02-instant-rerun.png] Re-run completes much faster (no API calls) — uses cached FAF data from pipeline
