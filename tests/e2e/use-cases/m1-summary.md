# Milestone 1 — What Can You Do Now?

**App:** https://supply-map-simulator.vercel.app

## Use Case: Explore Freight Data for a Territory

### What you can do

1. **Search for a territory** — type "Atlanta Metro", "US Southeast", "Benelux", "France", or any other territory in the search bar
2. **Start the data pipeline** — click "Start Pipeline" to begin loading real data
3. **Watch three data sources load in parallel:**
   - **FAF Freight Data** — real county-to-county freight tonnage from the Bureau of Transportation Statistics FAF5 dataset. For SE USA territories, you'll see ~451M tons across 147 county pairs and 11 commodity types. Non-palletizable commodities (coal, gravel, petroleum) are filtered out per the Physical Internet methodology.
   - **OSM Road/Rail** — live queries to the Overpass API for roads (interstates, highways, trunk roads) and rail (railroads, yards). Takes 30-60 seconds. You can see separate progress bars for road and rail data.
   - **Infrastructure Sites** — live Overpass queries for existing logistics facilities: warehouses, terminals, distribution centers, ports, airports, rail yards. For Atlanta Metro, expect ~879 sites.
4. **Change territory** — click "Change Territory" to go back and try a different region

### What the data means (domain perspective)

- **451M tons** for the SE USA represents the total annual freight tonnage flowing between counties in this megaregion — this is the demand that a Physical Internet hub network needs to serve
- **147 county pairs** are the origin-destination flows — each pair has a tonnage value representing how much freight moves between those two counties
- **11 commodities** are the palletizable freight categories (mixed freight, cereal grains, machinery, electronics, etc.) that can flow through PI hubs
- **Infrastructure sites** are real existing facilities from OpenStreetMap that could serve as candidate locations for PI hubs — the network generator (coming in M3) will select from these sites

### What's coming next

- **M2 (Space Pixelization)** — the system will cluster the counties into areas and regions using demand-balanced K-means clustering, following Montreuil's IPIC 2025 methodology. You'll see a 3-step stepper: counties colored by demand → clustered into ~186 areas → grouped into ~50 regions.
- **M3 (Network Map Core)** — the generated hub network (Global/Regional/Gateway hubs) displayed on the interactive map with color-coded markers and edges
- **M4-M6** — advanced views, flow analysis, export

### Known limitations

- **Overpass API can be slow or rate-limited** — if you see ERROR with "429 after 5 retries" or "504", click Retry or wait a few minutes. This is an external API issue, not an app bug.
- **FAF data only available for SE USA** — selecting non-SE territories (like Benelux or France) shows "No freight data available." OSM and Infrastructure will still load for any territory.
- **No map visualization yet** — the data loads in the sidebar but doesn't appear on the map. Hub markers on the map come in M3.
- **No clustering or network generation** — the app collects data but doesn't process it yet. Space pixelization comes in M2.
