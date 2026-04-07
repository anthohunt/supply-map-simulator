# Milestone 1 — Use Case Document

## Test Territories
- **Atlanta Metro** (bbox `[-84.90, 33.40, -83.90, 34.20]`) — fast Overpass
- **Benelux** (no FAF data) — triggers "no freight data"
- **Rural County** (bbox `[-84.5, 33.9, -84.4, 34.0]`) — tiny area, few infrastructure sites

---

## US-1.1 — Territory Search & Selection

### Happy path
1. [screenshot: US-1.1-01-app-loaded] Open app → "Territory Search" heading + combobox + dark map
2. [screenshot: US-1.1-02-typed-atl] Type "Atl" → dropdown shows "Atlanta Metro / STATE"
3. [screenshot: US-1.1-03-selected] Click Atlanta Metro → input filled, "Start Pipeline" button visible
4. [screenshot: US-1.1-04-pipeline-started] Click Start Pipeline → "Data Pipeline" heading with 3 panels

### E1 — No results
5. [screenshot: US-1.1-E1-01-type-nonsense] Fresh app → type "zzzzz" in search
6. [screenshot: US-1.1-E1-02-message-shown] Dropdown shows "No territories found. Try 'Southeast' or 'France'."

### E2 — Single character guard
7. [screenshot: US-1.1-E2-01-type-one-char] Fresh app → type "A" (1 character)
8. [screenshot: US-1.1-E2-02-no-dropdown] No autocomplete dropdown visible

### E3 — Change territory
9. [screenshot: US-1.1-E3-01-on-pipeline] On Data Pipeline screen with panels visible
10. [screenshot: US-1.1-E3-02-click-change] Click "Change Territory" button
11. [screenshot: US-1.1-E3-03-back-to-search] Back on Territory Search with empty input

---

## US-1.2 — FAF Freight Data

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
12. [screenshot: US-1.2-01-faf-loading] FAF panel shows "LOADING" with progress bar
13. [screenshot: US-1.2-02-faf-complete] FAF shows "COMPLETE" + Total Tonnage + County Pairs + Commodities

### E1 — No freight data (non-SE territory)
14. [screenshot: US-1.2-E1-01-select-benelux] Fresh app → type "Bene" → select "Benelux"
15. [screenshot: US-1.2-E1-02-start-pipeline] Click Start Pipeline → Data Pipeline screen
16. [screenshot: US-1.2-E1-03-no-data-warning] FAF panel shows "No freight data available" warning

### E2 — Offline fallback (network blocked)
17. [screenshot: US-1.2-E2-01-app-ready] Fresh app with Atlanta Metro selected, about to start
18. [screenshot: US-1.2-E2-02-block-and-start] Block FAF fetch via `page.route()` → click Start Pipeline
19. [screenshot: US-1.2-E2-03-error-or-fallback] FAF shows offline warning or error + retry button

### E3 — Resume after navigation
20. [screenshot: US-1.2-E3-01-pipeline-loading] Start pipeline → panels loading
21. [screenshot: US-1.2-E3-02-click-change] Click "Change Territory" mid-load
22. [screenshot: US-1.2-E3-03-back-search] Back on search screen
23. [screenshot: US-1.2-E3-04-restart-clean] Re-select Atlanta Metro → Start Pipeline → loads fresh, no stale state

---

## US-1.3 — OSM Road/Rail

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
24. [screenshot: US-1.3-01-osm-loading] OSM panel shows "LOADING" + "Road" and "Rail" progress bars
25. [screenshot: US-1.3-02-osm-complete] OSM shows "COMPLETE" + Interstates + Highways + Railroads + Rail Yards + Road km + Rail km

### E1 — Rate limit (429)
26. [screenshot: US-1.3-E1-01-inject-429] Block Overpass via `page.route('**/overpass-api.de/**', r => r.fulfill({ status: 429 }))`
27. [screenshot: US-1.3-E1-02-start-pipeline] Start pipeline → OSM begins loading
28. [screenshot: US-1.3-E1-03-error-message] OSM shows "Overpass API error 429 after 5 retries" + Retry button

### E2 — Retry after error
29. [screenshot: US-1.3-E2-01-error-state] OSM in ERROR state with Retry button visible
30. [screenshot: US-1.3-E2-02-click-retry] Click Retry → unblock Overpass route
31. [screenshot: US-1.3-E2-03-loading-again] OSM resets to "LOADING" and re-attempts

### E3 — Malformed geometry
32. [screenshot: US-1.3-E3-01-inject-malformed] Use `page.route('**/overpass-api.de/**', r => r.fulfill({ body: '{"elements":[{"type":"way","id":1,"geometry":null}]}' }))` to return malformed geometry
33. [screenshot: US-1.3-E3-02-start-pipeline] Start pipeline → OSM begins loading with intercepted response
34. [screenshot: US-1.3-E3-03-skipped-count] OSM shows "X elements skipped" count or completes with 0 valid segments

---

## US-1.4 — Infrastructure Sites

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
33. [screenshot: US-1.4-01-infra-loading] Infrastructure panel shows "LOADING" + progress bar
34. [screenshot: US-1.4-02-infra-complete] Shows "COMPLETE" + Total Sites + Warehouses + Terminals + DCs + Ports + Airports + Rail Yards

### E1 — Few sites (tiny territory)
35. [screenshot: US-1.4-E1-01-add-tiny-territory] Add "Rural County" territory (tiny bbox) to territory list
36. [screenshot: US-1.4-E1-02-select-rural] Select Rural County → Start Pipeline
37. [screenshot: US-1.4-E1-03-few-sites-warning] Infrastructure shows "Few facilities found" warning (or very low count)

### E2 — Duplicates removed
38. [screenshot: US-1.4-E2-01-complete-with-dedup] After Atlanta Metro pipeline completes → check if "X duplicates removed" count is visible
39. [screenshot: US-1.4-E2-02-dedup-detail] If visible, capture the count. If 0 duplicates, note "no duplicates in this territory"

### E3 — Incomplete data
40. [screenshot: US-1.4-E3-01-inject-incomplete] Use `page.route('**/overpass-api.de/**', r => r.fulfill({ body: '{"elements":[{"type":"node","id":1,"tags":{"building":"warehouse"},"lat":33.7,"lon":-84.4}]}' }))` to return nodes without area data
41. [screenshot: US-1.4-E3-02-start-pipeline] Start pipeline → Infrastructure loads with intercepted response
42. [screenshot: US-1.4-E3-03-excluded-count] Infrastructure shows "X excluded — incomplete data" count

---

## Full Flow Integration

41. [screenshot: US-1.0-01-fresh-start] Fresh app → search "Atl" → select Atlanta Metro
42. [screenshot: US-1.0-02-start-clicked] Click Start Pipeline → all 3 panels appear
43. [screenshot: US-1.0-03-mid-loading] FAF complete, OSM loading, Infra loading — progress advancing
44. [screenshot: US-1.0-04-final-state] All panels in final state + Overall Progress bar

---

## Summary

| Story | Happy path screenshots | Edge case screenshots | SKIP |
|-------|----------------------|----------------------|------|
| US-1.1 | 4 | 7 (E1:2, E2:2, E3:3) | 0 |
| US-1.2 | 2 | 10 (E1:3, E2:3, E3:4) | 0 |
| US-1.3 | 2 | 9 (E1:3, E2:3, E3:3) | 0 |
| US-1.4 | 2 | 8 (E1:3, E2:2, E3:3) | 0 |
| Integration | 4 | 0 | 0 |
| **Total** | **14** | **34** | **0** |

**48 total screenshots. 0 SKIPs. Every edge case tested via e2e.**
