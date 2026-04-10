# Project Memory — Supply Map Simulator

**Concept:** Physical Internet hyperconnected freight network designer. Montreuil IPIC 2025 methodology. Users select a territory, load real freight/infrastructure data, run multi-tier K-means pixelization, generate an optimized hub network, analyze freight flows, and export results.

**Status:** Step 6 — Reconciliation & Delivery. All 6 milestones complete. Hardening Round 1 done (17 critical+high fixes). 19 unchanged, 7 modified, 5 new, 0 removed stories.

**App:** `C:/Users/ahunt/projects/supply-map-simulator/`
**GitHub:** https://github.com/anthohunt/supply-map-simulator
**Vercel:** https://supply-map-simulator.vercel.app

**Tech:** React 18 + TypeScript strict, Vite 5, Leaflet.js, Zustand, Recharts (lazy), CSS Modules, Kepler Dark Geo design. Data: BTS FeatureServer (road/rail), Overpass (infrastructure), bundled FAF5 JSON (freight). E2E: Playwright. Deploy: Vercel.

**Key modifications from spec:** FAF data bundled (no live API), road/rail via BTS (not Overpass), split view lighter rendering (perf), infrastructure canvas renderer (perf), a11y partial (hub markers lack ARIA/keyboard).

**Hardening:** 5 critical + 12 high fixed. Error boundary, canvas renderer, split view lighter, sub-region chunking, mobile responsive, memory leak fixes, code splitting, 3D caching, WCAG contrast, ARIA tabs, reduced motion. 16 medium + 14 low deferred.

**Build:** 487KB main + 344KB recharts chunk + 200KB html2canvas. E2E: 69/70 happy path, 55/55 edge cases.

**Language:** French (user preference)
