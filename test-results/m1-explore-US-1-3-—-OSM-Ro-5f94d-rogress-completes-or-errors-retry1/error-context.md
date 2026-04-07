# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m1-explore.spec.ts >> US-1.3 — OSM Road/Rail >> Happy path: separate Road/Rail progress, completes or errors
- Location: tests\e2e\m1-explore.spec.ts:115:3

# Error details

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, open 'C:\Users\ahunt\projects\supply-map-simulator\test-results\.playwright-artifacts-1\traces\9560227a2be638553f39-f7291d473d40f7233566-retry1.network'
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary "Control sidebar" [ref=e4]:
    - heading "Supply Map" [level=1] [ref=e6]
    - generic [ref=e8]:
      - heading "Data Pipeline" [level=2] [ref=e9]
      - paragraph [ref=e10]: Atlanta Metro
      - generic [ref=e12]:
        - generic [ref=e13]: Overall Progress
        - generic [ref=e14]: 65%
      - generic [ref=e17]:
        - region "FAF freight data" [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: FAF Freight Data
            - generic [ref=e21]: Complete
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]: Total Tonnage
              - generic [ref=e27]: 451.4M tons
            - generic [ref=e28]:
              - generic [ref=e29]: County Pairs
              - generic [ref=e30]: "147"
            - generic [ref=e31]:
              - generic [ref=e32]: Commodities
              - generic [ref=e33]: "11"
        - region "OSM road and rail data" [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: OSM Road / Rail
            - generic [ref=e37]: Error
          - generic [ref=e38]:
            - paragraph [ref=e39]: "Road data failed: Overpass API error 429 after 5 retries"
            - button "Retry" [ref=e40] [cursor=pointer]
        - region "Infrastructure sites" [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]: Infrastructure Sites
            - generic [ref=e44]: Complete
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Total Sites
              - generic [ref=e50]: "879"
            - generic [ref=e51]:
              - generic [ref=e52]: Warehouses
              - generic [ref=e53]: "367"
            - generic [ref=e54]:
              - generic [ref=e55]: Terminals
              - generic [ref=e56]: "8"
            - generic [ref=e57]:
              - generic [ref=e58]: Dist. Centers
              - generic [ref=e59]: "457"
            - generic [ref=e60]:
              - generic [ref=e61]: Ports
              - generic [ref=e62]: "0"
            - generic [ref=e63]:
              - generic [ref=e64]: Airports
              - generic [ref=e65]: "28"
            - generic [ref=e66]:
              - generic [ref=e67]: Rail Yards
              - generic [ref=e68]: "19"
          - generic [ref=e70]:
            - generic [ref=e71]: Deduped
            - generic [ref=e72]: 1,797
      - button "Change territory" [ref=e73] [cursor=pointer]: Change Territory
  - main [ref=e74]:
    - region "Interactive freight network map" [ref=e75]:
      - generic [ref=e76]:
        - generic:
          - generic [ref=e77]:
            - button "Zoom in" [ref=e78] [cursor=pointer]: +
            - button "Zoom out" [ref=e79] [cursor=pointer]: −
          - generic [ref=e80]:
            - link "Leaflet" [ref=e81] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e82]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e86] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e87] [cursor=pointer]:
              - /url: https://carto.com/
```