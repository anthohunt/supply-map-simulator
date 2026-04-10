# Supply Map Simulator — Full App Walkthrough

*What can you do today, from scratch?*

---

## 1. Landing Page

You open the app and see a full-screen dark map (CartoDB Dark Matter tiles) centered on the eastern US. A left sidebar shows:

- **"Supply Map"** header
- **Step indicator:** 1 Territory > 2 Data > 3 Cluster > 4 Network
- **Territory Search** with a search bar: "Search for a megaregion, country, or state to begin network generation."
- **Tile style picker** in the bottom-right corner: Dark (default), Light, Satellite, Terrain

**What you can do:** Type in the search bar. Autocomplete appears after 2+ characters. Switch map tiles to see the same map in different styles. The tile choice persists across page reloads (saved in localStorage).

---

## 2. Select a Territory

Type "Tex" and select **"Texas Triangle Megaregion"** from the dropdown. The map:
- Zooms to the Texas Triangle bounding box
- Draws a **cyan dashed boundary** around the territory
- Shows a confirmation card with the territory name and a **"Start Pipeline"** button

Other available territories include Atlanta Metro, Northeast Corridor, Great Lakes, and other US megaregions/states.

**What you can do:** Confirm to start the pipeline, or search again to change your selection.

---

## 3. Data Pipeline

Click **"Start Pipeline"** and three data sources begin loading:

### FAF Freight Data (instant — bundled dataset)
- Loads county-to-county annual tonnage from the Bureau of Transportation Statistics FAF5 dataset
- Shows: **total tonnage** (e.g., 451.4M tons), **county pairs** (147), **commodities** (11)
- **Commodity filter buttons** — toggle individual commodities (Mixed Freight, Electronics, Pharmaceuticals, Food Products, Beverages, Textiles, Plastics/Rubber, Chemicals, etc.) to see how tonnage changes

### Road & Rail Network (real Overpass API — takes 5-15 min for large territories)
- Fetches real highway, railroad, and rail yard geometry from OpenStreetMap
- Shows chunk progress (e.g., "Chunking: 3/16 sub-regions"), elapsed time, and estimated time remaining
- When complete: shows road km, rail km, and yard count

### Infrastructure Sites (real Overpass API — runs after road/rail)
- Finds warehouses, terminals, distribution centers, ports, airports within the territory
- Shows count by type, total sqft, and a "duplicates removed" count
- Site markers appear on the map as you hover items in the summary

**What you can do:** Watch the progress bars, toggle commodity filters, hover infrastructure sites. You can also click "Change Territory" to go back. The pipeline handles rate limits (429 → countdown timer) and retries automatically.

---

## 4. Space Pixelization (Clustering)

Once the pipeline completes, the sidebar transitions to **clustering controls**:

- **"Start Pixelization"** button appears
- Click it and the app runs **demand-weighted K-means clustering**:
  - Counties are grouped into **Areas** (tier 1)
  - Areas are grouped into **Regions** (tier 2)
  - Post-processing ensures contiguity (no disconnected fragments)
  - Zero-demand counties get assigned to nearest area by geography

### Parameter Controls
After pixelization completes, you get sliders to adjust:
- **Target Regions** (minimum 2, maximum = county count)
- **Demand Balance Weight**
- **Contiguity Constraint**
- **Compactness Weight**

Click **"Re-run"** to re-cluster with new parameters using cached source data (no re-fetching).

The map shows **colored region boundaries** with counties grouped visually.

**What you can do:** Adjust parameters, re-run clustering, see how different weights produce different region shapes. Cancel mid-computation if needed.

---

## 5. Network Generation

After pixelization, a **"Generate Hub Network"** overlay button appears on the map.

Click it and the optimizer places hubs in three tiers:
- **Global hubs** (orange) — fixed at major ports and airports (isFixed: true)
- **Regional hubs** (red) — placed so connected pairs are within 5.5 hours drive time
- **Gateway hubs** (cyan) — placed at the best candidate infrastructure sites

Edges connect hubs with **tier-specific colored lines**.

At low zoom, hubs **cluster into numbered markers** (e.g., "42") to prevent overlap. Zoom in to see individual hub dots.

**What you can do at this point (M1-M4 features):**

---

## 6. Hub Exploration

### Click any hub
A **slide-out detail panel** opens from the right showing:
- Hub name, tier badge (Global/Regional/Gateway)
- Throughput and capacity in tons
- List of candidate sites in the cluster
- Connected hubs — **click any connected hub** to pan to it and open its panel
- Global hubs show "Fixed location — not generated from candidates"

On mobile (<768px), the panel appears as a **bottom sheet** instead.

### Layer Controls (sidebar)
The sidebar now shows the **Network Explorer** with:

**Hub Tiers** — Toggle Global, Regional, Gateway on/off independently. All off shows a hint: "Enable at least one tier to view the network."

**Infrastructure Overlays** — Toggle Highways (orange lines), Railroads (purple dashed), Ports (cyan dots), Airports (green dots). If a data type has no results for this territory, the toggle is disabled with a tooltip explaining why.

**Boundary Overlays** — Toggle Region, Area, and County boundaries independently.
- Region boundaries: thick dashed outlines, colored by region
- Area boundaries: filled polygons, region-colored
- County boundaries: thin outlines with **name labels at zoom 8+** (e.g., "Harris", "Travis", "Dallas")
- Disabled if pixelization hasn't run yet (with hint text)

**Opacity Sliders** — Three sliders (0-100%) for Hubs, Infrastructure, and Boundaries. Changes are instant. Default is 100%.

---

## 7. Split View

Click the **"Split View"** button (top-right corner, appears after network generation).

- Two maps appear **side by side**, both showing the same network
- **Pan/zoom syncs** — move one map, the other follows
- **Independent tile styles** — switch the right map to Light while left stays Dark for visual comparison
- **Independent layer controls** — the right panel has its own mini overlay buttons (G/R/Gw for hub tiers, Reg/Area/Cty for boundaries). Toggle layers on one side without affecting the other.
- On narrow viewports (<1024px), maps **stack vertically**
- Click **"Exit Split"** to return to single view (left panel state preserved)

---

## 8. 3D Projection

Click the **"3D"** button (top-right, next to Split View).

- The map tilts and a **canvas overlay** renders hubs at different elevation levels:
  - Regional hubs float highest (60px above base)
  - Gateway hubs at middle elevation (30px)
  - Global hubs at base level
- Edge lines connect hubs across elevations
- **Rotate with arrow keys** (left/right)
- Click hubs on elevated planes — click targeting works despite perspective
- **FPS monitoring** — if performance drops below 30fps, a warning appears
- **WebGL fallback** — if your browser doesn't support WebGL, a message explains why 3D isn't available
- Click **"3D On"** again to return to flat 2D

---

## 9. Map Tile Styles

The bottom-right tile picker works everywhere (single view, split view, 3D):
- **Dark** (CartoDB Dark Matter) — default, best contrast for data overlays
- **Light** (CartoDB Positron) — clean white base
- **Satellite** (ESRI World Imagery) — real aerial photography
- **Terrain** (Stamen Terrain) — topographic with elevation shading

Your selection persists across page reloads.

---

## What's NOT built yet

### M5: Flow Analysis (coming next)
- Animated freight flows along network edges (line thickness = volume)
- Corridor analysis table ranked by throughput
- Flow filters (by origin, destination, commodity, volume)
- Network stats dashboard (hub counts, throughput charts, demand balance score)

### M6: Export
- PNG screenshot of the map
- GeoJSON (hubs + edges + regions as geometry)
- JSON (structured hub data)
- CSV (flow data with proper quoting)

---

## Quick Reference

| Action | How |
|--------|-----|
| Search territory | Type 2+ chars in search bar |
| Change territory | Click "Change Territory" during pipeline |
| Filter commodities | Click commodity buttons in FAF panel |
| Re-run clustering | Adjust sliders, click "Re-run" |
| Inspect a hub | Click any hub marker on the map |
| Navigate to connected hub | Click a hub name in the detail panel |
| Toggle layers | Use sidebar toggles (Hub Tiers / Infrastructure / Boundaries) |
| Adjust transparency | Use Opacity sliders (Hubs / Infrastructure / Boundaries) |
| Compare views | Enable Split View, set different tiles/layers per side |
| See 3D elevation | Click "3D" button, rotate with arrow keys |
| Switch map style | Click Dark/Light/Satellite/Terrain in bottom-right |
