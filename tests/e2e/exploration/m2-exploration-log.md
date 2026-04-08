# M2 — Space Pixelization — Exploration Log

## US-1.5

- **Step 1** — View pipeline dashboard after all sources complete
  - Observed: Dashboard shows FAF, OSM, Infra all complete. "Start Pixelization" button visible.
  - Screenshot: `US-1.5-01-pipeline-complete.png`
  - Issues: none

- **Step 2** — Click "Start Pixelization"
  - Observed: Pixelization screen loads, auto-starts (status: running, progress: 15%), step 1 "Color counties" active.
  - Screenshot: `US-1.5-02-pixelization-started.png`
  - Issues: none

- **Step 3** — Observe clustering progress
  - Observed: Step indicators show mid-progress (status: running, 60%). "Cluster into areas" step active.
  - Screenshot: `US-1.5-03-clustering-progress.png`
  - Issues: none

- **Step 4** — View completed pixelization
  - Observed: Results panel: 8 areas, 4 regions, contiguous: 8/8.
  - Screenshot: `US-1.5-04-pixelization-complete.png`
  - Issues: none

- **Step 5** — View map with boundaries
  - Observed: Map shows area boundaries (thin colored) and region boundaries (thick dashed) with color coding.
  - Screenshot: `US-1.5-05-map-boundaries.png`
  - Issues: none

- **Step 6** — View region list
  - Observed: Region list shows 4 regions with color dot, area count, and demand tonnage.
  - Screenshot: `US-1.5-06-region-list.png`
  - Issues: none

## US-1.5-E1

- **Step 1** — Run pixelization with reference counties (some have zero FAF demand)
  - Observed: Territory has 8 areas with 64 total counties (50 from FAF, 14 zero-demand from reference).
  - Screenshot: `US-1.5-E1-01-zero-demand-territory.png`
  - Issues: none

- **Step 2** — Verify zero-demand county is assigned to an area
  - Observed: Zero-demand county (12001) assigned: true. 14 zero-demand counties joined nearest areas by geographic proximity.
  - Screenshot: `US-1.5-E1-02-zero-demand-assigned.png`
  - Issues: none

## US-1.5-E2

- **Step 1** — Run clustering and check contiguity results
  - Observed: After clustering: 8/8 areas are contiguous.
  - Screenshot: `US-1.5-E2-01-run-clustering.png`
  - Issues: none

- **Step 2** — Verify post-processing fixed non-contiguous areas
  - Observed: Post-processing ensured 8/8 contiguous. Disconnected fragments reassigned.
  - Screenshot: `US-1.5-E2-02-contiguous-result.png`
  - Issues: none

## US-1.5-E3

- **Step 1** — Select a very small territory with < 3 counties
  - Observed: Navigated to territory selection to set up small territory.
  - Screenshot: `US-1.5-E3-01-small-territory.png`
  - Issues: none

- **Step 2** — Observe error for too few counties
  - Observed: Error: "Too few counties (2) for meaningful clustering. Try expanding the territory.". Status: error.
  - Screenshot: `US-1.5-E3-02-too-few-warning.png`
  - Issues: none

## US-1.5-E4

- **Step 1** — Start pixelization and observe progress
  - Observed: Pixelization is running (status: running, progress: 40%). Cancel button visible.
  - Screenshot: `US-1.5-E4-01-running.png`
  - Issues: none

- **Step 2** — Click Cancel button
  - Observed: Status: idle. Partial results discarded (areas: 0).
  - Screenshot: `US-1.5-E4-02-cancelled.png`
  - Issues: none

## US-1.6

- **Step 1** — View parameter panel after pixelization complete
  - Observed: Parameter panel visible with sliders: Target Regions, Demand Balance, Contiguity, Compactness.
  - Screenshot: `US-1.6-01-params-visible.png`
  - Issues: none

- **Step 2** — Change Target Regions slider from 4 to 6
  - Observed: Slider updated to 6.
  - Screenshot: `US-1.6-02-change-regions.png`
  - Issues: none

- **Step 3** — Click "Re-run Pixelization" with target=6
  - Observed: Re-run complete: 6 regions, 12 areas.
  - Screenshot: `US-1.6-03-rerun-complete.png`
  - Issues: none

- **Step 4** — View updated map after re-run
  - Observed: Map shows updated boundary layout with 6 regions and different colors.
  - Screenshot: `US-1.6-04-map-updated.png`
  - Issues: none

## US-1.6-E1

- **Step 1** — Set target regions to 1 (below minimum)
  - Observed: Slider min is 2, so value set via store to bypass slider constraint.
  - Screenshot: `US-1.6-E1-01-set-to-1.png`
  - Issues: none

- **Step 2** — Check validation message for targetRegions=1
  - Observed: Validation: "Minimum 2 regions required". Re-run button disabled to prevent invalid clustering.
  - Screenshot: `US-1.6-E1-02-validation-error.png`
  - Issues: none

## US-1.6-E2

- **Step 1** — Set target regions to 55 (higher than 50 county count)
  - Observed: Validation: "Maximum 50 regions (limited by county count)". Re-run button disabled.
  - Screenshot: `US-1.6-E2-01-high-regions.png`
  - Issues: none

- **Step 2** — View validation error for target > county count
  - Observed: Validation shows "Maximum 50 regions (limited by county count)". Re-run button disabled: true.
  - Screenshot: `US-1.6-E2-02-capped-result.png`
  - Issues: none

## US-1.6-E3

- **Step 1** — Adjust parameters after first run
  - Observed: Changed target regions to 5.
  - Screenshot: `US-1.6-E3-01-adjust-params.png`
  - Issues: none

- **Step 2** — Re-run uses cached data (no API re-fetch)
  - Observed: Re-run completed in 38ms. External API calls during re-run: 0. Uses cached FAF data from pipeline.
  - Screenshot: `US-1.6-E3-02-instant-rerun.png`
  - Issues: none

