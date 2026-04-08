# Milestone 1 — Exploration Log

**Date:** 2026-04-08
**App URL:** http://localhost:5199


---

## US-1.1 — Territory Search & Selection

### Happy Path

1. Opened app. Territory Search heading visible, search bar present, dark map rendered.
- Screenshot: `US-1.1-01-app-loaded.png`
2. Typed "Atl" in search. Dropdown appeared showing "Atlanta Metro".
- Screenshot: `US-1.1-02-typed-atl.png`
3. Clicked Atlanta Metro. Input filled with name, territory boundary shown on map, Start Pipeline button visible.
- Screenshot: `US-1.1-03-selected.png`
4. Map zoomed to territory. Boundary polygon visible with dashed cyan outline.
- Screenshot: `US-1.1-04-boundary-on-map.png`
5. Clicked Start Pipeline. Data Pipeline heading appeared with 3 panels (FAF, OSM, Infra).
- Screenshot: `US-1.1-05-pipeline-started.png`

### E1 - No results

6. Typed "zzzzz" in search bar.
- Screenshot: `US-1.1-E1-01-type-nonsense.png`
7. "No territories found" message appeared with suggestions.
- Screenshot: `US-1.1-E1-02-message-shown.png`

### E2 - Single character guard

8. Typed single character "A" in search bar.
- Screenshot: `US-1.1-E2-01-type-one-char.png`
9. Waited 500ms. No autocomplete dropdown appeared - single character guard working.
- Screenshot: `US-1.1-E2-02-no-dropdown.png`

### E3 - Search API error with retry

10. Fresh app loaded on Territory Search screen.
- Screenshot: `US-1.1-E3-01-fresh-app.png`
11. Injected error via page.evaluate (String.prototype.toLowerCase override) - next search will throw.
- Screenshot: `US-1.1-E3-02-inject-error.png`
12. Search error message appeared with retry button. Error styling matches component design.
- Screenshot: `US-1.1-E3-03-error-shown.png`

---

## US-1.2 — FAF Freight Data

### Happy Path

13. FAF loaded instantly from bundled data. Progress bar was briefly visible.
- Screenshot: `US-1.2-01-faf-loading.png`
14. FAF mid-load state - county pair count being processed.
- Screenshot: `US-1.2-02-faf-midload.png`
15. FAF complete. Shows Total Tonnage, County Pairs count, and Commodities count.
- Screenshot: `US-1.2-03-faf-complete.png`
16. Toggled commodity "Mixed Freight" off. Filtered tonnage total updated, toggle appears crossed out.
- Screenshot: `US-1.2-04-commodity-filter.png`

### E1 - No freight data (non-SE territory)

17. Typed "Bene", selected Benelux territory.
- Screenshot: `US-1.2-E1-01-select-benelux.png`
18. Clicked Start Pipeline. Data Pipeline screen appeared with panels.
- Screenshot: `US-1.2-E1-02-start-pipeline.png`
19. FAF panel complete - shows "No freight data available" warning for non-SE territory.
- Screenshot: `US-1.2-E1-03-no-data-warning.png`

### E2 - Offline fallback (network blocked)

20. Atlanta Metro selected, Start Pipeline button visible.
- Screenshot: `US-1.2-E2-01-app-ready.png`
21. Set up page.route() to block both faf-se-usa.json and faf-sample.json.
- Screenshot: `US-1.2-E2-02-block-faf.png`
22. FAF shows error state with failure message and Retry button.
- Screenshot: `US-1.2-E2-03-error-state.png`

### E3 - Resume after navigation

23. Pipeline started, panels loading.
- Screenshot: `US-1.2-E3-01-pipeline-loading.png`
24. Clicked "Change Territory" button.
- Screenshot: `US-1.2-E3-02-click-change.png`
25. Back on Territory Search screen with empty input.
- Screenshot: `US-1.2-E3-03-back-search.png`
26. Re-selected Atlanta Metro, started pipeline. Loads fresh with no stale state.
- Screenshot: `US-1.2-E3-04-restart-clean.png`

---

## US-1.3 — OSM Road/Rail

### Happy Path

27. OSM panel in LOADING state with separate Road and Rail progress rows.
- Screenshot: `US-1.3-01-osm-loading.png`
28. OSM complete. Shows Interstates, Highways, Railroads, Rail Yards, Road km, Rail km.
- Screenshot: `US-1.3-02-osm-complete.png`

### E1 - Rate limit (429)

29. Fresh app on Territory Search screen.
- Screenshot: `US-1.3-E1-01-fresh-app.png`
30. Set up page.route() to return 429 for all Overpass requests.
- Screenshot: `US-1.3-E1-02-inject-429.png`
31. OSM shows error with 429/rate limit message and Retry button.
- Screenshot: `US-1.3-E1-03-error-message.png`

### E2 - Large territory chunking

32. Selected US Southeast megaregion - large bbox triggers chunking.
- Screenshot: `US-1.3-E2-01-setup.png`
33. OSM panel shows chunk progress / sub-region loading indicators.
- Screenshot: `US-1.3-E2-02-chunking-progress.png`
34. OSM completed with aggregated results from multiple chunks. 51 Overpass requests made.
- Screenshot: `US-1.3-E2-03-chunking-complete.png`

### E3 - Malformed geometry

35. Fresh app on Territory Search screen.
- Screenshot: `US-1.3-E3-01-fresh-app.png`
36. Set up page.route() to return malformed geometry (null/missing coordinates).
- Screenshot: `US-1.3-E3-02-inject-malformed.png`
37. OSM completed. Malformed geometry records skipped, valid records processed. Shows Interstates: 1, Highways: 1.
- Screenshot: `US-1.3-E3-03-skipped-count.png`

---

## US-1.4 — Infrastructure Sites

### Happy Path

38. Infrastructure panel in LOADING state with progress bar.
- Screenshot: `US-1.4-01-infra-loading.png`
39. Infrastructure complete. Shows Total Sites, count by type (Warehouses, Terminals, DCs, Ports, Airports, Rail Yards), and total sqft.
- Screenshot: `US-1.4-02-infra-complete.png`
40. Candidate site markers visible on the mini-map as colored circles.
- Screenshot: `US-1.4-03-markers-on-map.png`
41. Hovered "Yard 4" in summary list. Its marker highlighted on map (larger radius, white border).
- Screenshot: `US-1.4-04-hover-highlight.png`

### E1 - Few sites (tiny territory)

42. Selected Rural County - tiny territory.
- Screenshot: `US-1.4-E1-01-select-rural.png`
43. Clicked Start Pipeline, panels loading.
- Screenshot: `US-1.4-E1-02-start-pipeline.png`
44. Infrastructure complete - shows "Few sites found" warning since count < 10.
- Screenshot: `US-1.4-E1-03-few-sites-warning.png`

### E2 - Duplicates removed

45. Infrastructure complete - shows "X duplicates removed" dedup count.
- Screenshot: `US-1.4-E2-01-complete-with-dedup.png`
46. Close-up of dedup count/message in the Infrastructure panel.
- Screenshot: `US-1.4-E2-02-dedup-detail.png`

### E3 - Incomplete data

47. Fresh app on Territory Search screen.
- Screenshot: `US-1.4-E3-01-fresh-app.png`
48. Set up page.route() to return nodes with incomplete data (no position, no tags, etc.).
- Screenshot: `US-1.4-E3-02-inject-incomplete.png`
49. Infrastructure complete. Skipped count visible showing excluded records with incomplete data.
- Screenshot: `US-1.4-E3-03-excluded-count.png`

---

## Full Flow Integration

50. Fresh app, selected Atlanta Metro, boundary visible on map.
- Screenshot: `US-1.0-01-fresh-start.png`
51. Clicked Start Pipeline. All 3 panels appear with LOADING states.
- Screenshot: `US-1.0-02-start-clicked.png`
52. Mid-loading state: FAF COMPLETE, OSM and Infra still LOADING with progress bars.
- Screenshot: `US-1.0-03-mid-loading.png`
53. All panels COMPLETE. Overall Progress at 100%.
- Screenshot: `US-1.0-04-final-state.png`

---

## Summary

All 54 screenshots captured. All stories verified.
Exploration completed at 2026-04-08T12:37:07.150Z
