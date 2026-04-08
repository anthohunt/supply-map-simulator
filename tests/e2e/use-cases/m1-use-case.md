# Milestone 1 — Use Case Document

## Test Territories
- **Atlanta Metro** (bbox `[-84.90, 33.40, -83.90, 34.20]`) — fast Overpass
- **Benelux** (no FAF data) — triggers "no freight data"
- **Rural County** (bbox `[-84.5, 33.9, -84.4, 34.0]`) — tiny area, few infrastructure sites

---

## US-1.1 — Territory Search & Selection

### Happy path
1. [screenshot: US-1.1-01-app-loaded] Open app → "Territory Search" heading + search bar + dark map visible
2. [screenshot: US-1.1-02-typed-atl] Type "Atl" → dropdown shows "Atlanta Metro"
3. [screenshot: US-1.1-03-selected] Click Atlanta Metro → input filled, mini-map highlights territory boundary, "Start Pipeline" button visible
4. [screenshot: US-1.1-04-boundary-on-map] Verify mini-map shows highlighted boundary polygon for the selected territory (zoom to show boundary clearly)
5. [screenshot: US-1.1-05-pipeline-started] Click Start Pipeline → "Data Pipeline" heading with 3 panels

### E1 — No results
6. [screenshot: US-1.1-E1-01-type-nonsense] Fresh app → type "zzzzz" in search → NO dropdown yet (showing the typed text)
7. [screenshot: US-1.1-E1-02-message-shown] Wait → dropdown shows "No territories found. Try 'Southeast' or 'France'."

### E2 — Single character guard
8. [screenshot: US-1.1-E2-01-type-one-char] Fresh app → type "A" (1 character) → show the input with "A"
9. [screenshot: US-1.1-E2-02-no-dropdown] Wait 500ms → verify no autocomplete dropdown appeared (snapshot confirms no dropdown)

### E3 — Search API error with retry
10. [screenshot: US-1.1-E3-01-fresh-app] Fresh app on Territory Search screen
11. [screenshot: US-1.1-E3-02-inject-error] Use `page.route()` to intercept territory search/autocomplete and return 500 error
12. [screenshot: US-1.1-E3-03-error-shown] Type a search term → error message or retry prompt appears

---

## US-1.2 — FAF Freight Data

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
13. [screenshot: US-1.2-01-faf-loading] FAF panel shows "LOADING" status with progress bar actively advancing (capture DURING loading, not after)
14. [screenshot: US-1.2-02-faf-midload] FAF panel shows intermediate state: county pair count updating, progress bar partially filled
15. [screenshot: US-1.2-03-faf-complete] FAF shows "COMPLETE" + Total Tonnage + County Pairs + Commodities count
16. [screenshot: US-1.2-04-commodity-filter] Click a commodity type toggle → filtered tonnage total updates (show before/after or toggled state)

### E1 — No freight data (non-SE territory)
17. [screenshot: US-1.2-E1-01-select-benelux] Fresh app → type "Bene" → select "Benelux" → show selected state
18. [screenshot: US-1.2-E1-02-start-pipeline] Click Start Pipeline → Data Pipeline screen appears with panels
19. [screenshot: US-1.2-E1-03-no-data-warning] Wait for FAF to complete → FAF panel shows "No freight data available" warning

### E2 — Offline fallback (network blocked)
20. [screenshot: US-1.2-E2-01-app-ready] Fresh app with Atlanta Metro selected, Start Pipeline button visible
21. [screenshot: US-1.2-E2-02-block-faf] Set up `page.route()` to block FAF fetch requests (return network error)
22. [screenshot: US-1.2-E2-03-error-state] Click Start Pipeline → FAF shows error state with "Failed to load" + Retry button

### E3 — Resume after navigation
23. [screenshot: US-1.2-E3-01-pipeline-loading] Start pipeline → panels loading (capture while at least one panel is still LOADING)
24. [screenshot: US-1.2-E3-02-click-change] Click "Change Territory" → show the transition or confirmation
25. [screenshot: US-1.2-E3-03-back-search] Back on Territory Search screen with empty input
26. [screenshot: US-1.2-E3-04-restart-clean] Re-select Atlanta Metro → Start Pipeline → loads fresh, no stale state from previous run

---

## US-1.3 — OSM Road/Rail

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
27. [screenshot: US-1.3-01-osm-loading] OSM panel shows "LOADING" + separate "Road" and "Rail" progress rows
28. [screenshot: US-1.3-02-osm-complete] OSM shows "COMPLETE" + Interstates + Highways + Railroads + Rail Yards + Road km + Rail km

### E1 — Rate limit (429)
29. [screenshot: US-1.3-E1-01-fresh-app] Fresh app on Territory Search screen
30. [screenshot: US-1.3-E1-02-inject-429] Set up `page.route('**/overpass-api.de/**', r => r.fulfill({ status: 429 }))` → select Atlanta Metro → Start Pipeline
31. [screenshot: US-1.3-E1-03-error-message] OSM shows error with "429" or "rate limit" message + Retry button

### E2 — Large territory chunking
32. [screenshot: US-1.3-E2-01-setup] Select a large territory (or use page.route to simulate chunked Overpass responses)
33. [screenshot: US-1.3-E2-02-chunking-progress] OSM panel shows chunk progress or sub-region loading indicators
34. [screenshot: US-1.3-E2-03-chunking-complete] OSM completes with aggregated results from multiple chunks

NOTE: If the app does not implement chunking, document this as "NEEDS IMPLEMENTATION" with screenshots showing what happens instead.

### E3 — Malformed geometry
35. [screenshot: US-1.3-E3-01-fresh-app] Fresh app on Territory Search screen
36. [screenshot: US-1.3-E3-02-inject-malformed] Set up `page.route('**/overpass-api.de/**')` to return malformed geometry (elements with null/missing coordinates) → select territory → Start Pipeline
37. [screenshot: US-1.3-E3-03-skipped-count] OSM completes with skipped/warning count visible for invalid records

---

## US-1.4 — Infrastructure Sites

### Precondition: Atlanta Metro selected + pipeline started

### Happy path
38. [screenshot: US-1.4-01-infra-loading] Infrastructure panel shows "LOADING" + progress bar
39. [screenshot: US-1.4-02-infra-complete] Shows "COMPLETE" + Total Sites + count by type (Warehouses, Terminals, DCs, Ports, Airports, Rail Yards) + total sqft
40. [screenshot: US-1.4-03-markers-on-map] Candidate site markers visible on the mini-map (zoom if needed to show markers)
41. [screenshot: US-1.4-04-hover-highlight] Hover a site in the summary list → its marker highlights on the mini-map

NOTE: If site markers on map, sqft display, or hover-highlight are not implemented, document as "NEEDS IMPLEMENTATION" and build them.

### E1 — Few sites (tiny territory)
42. [screenshot: US-1.4-E1-01-select-rural] Fresh app → search "Rural" → select Rural County
43. [screenshot: US-1.4-E1-02-start-pipeline] Click Start Pipeline → pipeline begins loading
44. [screenshot: US-1.4-E1-03-few-sites-warning] Infrastructure shows "Few facilities found" warning (count < 10)

### E2 — Duplicates removed
45. [screenshot: US-1.4-E2-01-complete-with-dedup] After Atlanta Metro pipeline completes → Infrastructure panel shows "X duplicates removed" or dedup count
46. [screenshot: US-1.4-E2-02-dedup-detail] Close-up of the dedup count/message in the Infrastructure panel

### E3 — Incomplete data
47. [screenshot: US-1.4-E3-01-fresh-app] Fresh app on Territory Search screen
48. [screenshot: US-1.4-E3-02-inject-incomplete] Set up `page.route('**/overpass-api.de/**')` to return nodes without area/sqft data → select territory → Start Pipeline
49. [screenshot: US-1.4-E3-03-excluded-count] Infrastructure shows "X excluded — incomplete data" or "X skipped" count clearly visible (scroll if needed)

---

## Full Flow Integration

50. [screenshot: US-1.0-01-fresh-start] Fresh app → search "Atl" → select Atlanta Metro → show selected with boundary on map
51. [screenshot: US-1.0-02-start-clicked] Click Start Pipeline → all 3 panels appear with LOADING states
52. [screenshot: US-1.0-03-mid-loading] Capture mid-loading: at least one panel COMPLETE, others still LOADING — show progress difference
53. [screenshot: US-1.0-04-final-state] All panels COMPLETE + Overall Progress 100%

---

## Summary

| Story | Happy path screenshots | Edge case screenshots | Total |
|-------|----------------------|----------------------|-------|
| US-1.1 | 5 | 8 (E1:2, E2:2, E3:3+setup) | 13 |
| US-1.2 | 4 | 10 (E1:3, E2:3, E3:4) | 14 |
| US-1.3 | 2 | 9 (E1:3, E2:3, E3:3) | 11 |
| US-1.4 | 4 | 8 (E1:3, E2:2, E3:3) | 12 |
| Integration | 4 | 0 | 4 |
| **Total** | **19** | **35** | **54** |

**54 total screenshots. 0 SKIPs. Every spec acceptance criterion and edge case covered.**

## Changes from v1

- **US-1.1**: Added AC2 coverage (boundary highlight on map — screenshots 03, 04). Fixed E3 to match spec (API error during search, not "change territory").
- **US-1.2**: Added AC1 coverage (FAF loading state — screenshot 01 captured during load). Added AC2 (mid-load count — screenshot 02). Added AC4 (commodity filter toggle — screenshot 04).
- **US-1.3**: Fixed E2 to match spec (large territory chunking, not "retry after error").
- **US-1.4**: Added AC1 (site markers on map — screenshot 03). Added AC2 (sqft display — in screenshot 02). Added AC3 (hover-to-highlight — screenshot 04).
- **Duplicate prevention**: Each edge case pair now has clear action between trigger and result screenshots.
