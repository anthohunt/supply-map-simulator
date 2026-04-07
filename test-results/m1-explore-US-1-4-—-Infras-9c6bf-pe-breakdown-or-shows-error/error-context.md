# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m1-explore.spec.ts >> US-1.4 — Infrastructure Sites >> Happy path: loads sites with type breakdown or shows error
- Location: tests\e2e\m1-explore.spec.ts:198:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Infrastructure sites' }).getByRole('button', { name: /retry/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Infrastructure sites' }).getByRole('button', { name: /retry/i })

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
        - generic [ref=e14]: 78%
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
            - generic [ref=e37]: Complete
          - generic [ref=e38]:
            - generic [ref=e40]: Road
            - generic [ref=e44]: Rail
          - generic [ref=e47]:
            - generic [ref=e48]:
              - generic [ref=e49]: Interstates
              - generic [ref=e50]: 2,474
            - generic [ref=e51]:
              - generic [ref=e52]: Highways
              - generic [ref=e53]: 18,168
            - generic [ref=e54]:
              - generic [ref=e55]: Railroads
              - generic [ref=e56]: 2,145
            - generic [ref=e57]:
              - generic [ref=e58]: Rail Yards
              - generic [ref=e59]: "21"
            - generic [ref=e60]:
              - generic [ref=e61]: Road km
              - generic [ref=e62]: 3,848
            - generic [ref=e63]:
              - generic [ref=e64]: Rail km
              - generic [ref=e65]: 1,690
        - region "Infrastructure sites" [ref=e66]:
          - generic [ref=e67]:
            - generic [ref=e68]: Infrastructure Sites
            - generic [ref=e69]: Error
          - paragraph [ref=e70]: Overpass API error 429 after 5 retries
      - button "Change territory" [ref=e71] [cursor=pointer]: Change Territory
  - main [ref=e72]:
    - region "Interactive freight network map" [ref=e73]:
      - generic [ref=e74]:
        - generic:
          - generic [ref=e75]:
            - button "Zoom in" [ref=e76] [cursor=pointer]: +
            - button "Zoom out" [ref=e77] [cursor=pointer]: −
          - generic [ref=e78]:
            - link "Leaflet" [ref=e79] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e80]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e84] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e85] [cursor=pointer]:
              - /url: https://carto.com/
```

# Test source

```ts
  115 |   test('Happy path: separate Road/Rail progress, completes or shows error', async ({ page }) => {
  116 |     // Observed during exploration: OSM takes 30-60s for Atlanta Metro, sometimes 504/429 after retries (~45s)
  117 |     // Sleep 90s (observed worst case + buffer), then check final state
  118 |     await page.goto('/');
  119 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  120 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  121 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  122 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  123 |     await expect(osm).toBeVisible({ timeout: 5000 });
  124 |     // Verify Road/Rail labels visible immediately
  125 |     await expect(osm.getByText('Road', { exact: true })).toBeVisible();
  126 |     await expect(osm.getByText('Rail', { exact: true })).toBeVisible();
  127 |     // Sleep observed exploration time, then check result
  128 |     await page.waitForTimeout(90000);
  129 |     const text = await osm.textContent();
  130 |     expect(text).toMatch(/Complete|Error/);
  131 |     if (text?.includes('Complete')) {
  132 |       expect(text).toMatch(/Interstates/);
  133 |       expect(text).toMatch(/Highways/);
  134 |       expect(text).toMatch(/Railroads/);
  135 |     } else {
  136 |       // Error is valid — Overpass was down. Verify retry button exists.
  137 |       await expect(osm.getByRole('button', { name: /retry/i })).toBeVisible();
  138 |     }
  139 |   });
  140 | 
  141 |   test('E1: forced 429 shows error + retry button', async ({ page }) => {
  142 |     await page.route('**/overpass-api.de/**', route => route.fulfill({ status: 429, body: 'Rate limited' }));
  143 |     await page.goto('/');
  144 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  145 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  146 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  147 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  148 |     await expect(osm.getByText(/error.*429|429.*error/i)).toBeVisible({ timeout: 60000 });
  149 |     await expect(osm.getByRole('button', { name: /retry/i })).toBeVisible();
  150 |   });
  151 | 
  152 |   test('E2: large territory triggers chunking (multiple requests)', async ({ page }) => {
  153 |     let requestCount = 0;
  154 |     await page.route('**/overpass-api.de/**', route => {
  155 |       requestCount++;
  156 |       route.fulfill({
  157 |         status: 200, contentType: 'application/json',
  158 |         body: JSON.stringify({ elements: [{ type: 'way', id: requestCount, tags: { highway: 'motorway', ref: 'I-' + requestCount }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }] })
  159 |       });
  160 |     });
  161 |     await page.goto('/');
  162 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('US S', { delay: 100 });
  163 |     await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
  164 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  165 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  166 |     await expect(osm.getByText('Complete')).toBeVisible({ timeout: 30000 });
  167 |     // SE USA bbox is ~260 deg² / 25 threshold = should produce 10+ chunks
  168 |     expect(requestCount).toBeGreaterThan(5);
  169 |   });
  170 | 
  171 |   test('E3: malformed geometry skipped, valid elements kept', async ({ page }) => {
  172 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  173 |       status: 200, contentType: 'application/json',
  174 |       body: JSON.stringify({ elements: [
  175 |         { type: 'way', id: 1, tags: { highway: 'motorway' }, geometry: null },
  176 |         { type: 'way', id: 2, tags: { highway: 'trunk' }, geometry: [] },
  177 |         { type: 'way', id: 3, tags: { highway: 'motorway', ref: 'I-75' }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }
  178 |       ]})
  179 |     }));
  180 |     await page.goto('/');
  181 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  182 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  183 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  184 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  185 |     await expect(osm.getByText('Complete')).toBeVisible({ timeout: 15000 });
  186 |     // Only 1 valid motorway should survive
  187 |     await expect(osm.getByText('Interstates')).toBeVisible();
  188 |     const text = await osm.textContent();
  189 |     expect(text).toContain('1');
  190 |   });
  191 | });
  192 | 
  193 | // ═══════════════════════════════════════════════════
  194 | // US-1.4 — Infrastructure Sites
  195 | // ═══════════════════════════════════════════════════
  196 | 
  197 | test.describe('US-1.4 — Infrastructure Sites', () => {
  198 |   test('Happy path: loads sites with type breakdown or shows error', async ({ page }) => {
  199 |     // Observed during exploration: Infra takes 20-40s for Atlanta Metro, sometimes 504 after retries
  200 |     // Sleep 90s (same as OSM — they run in parallel), then check
  201 |     await page.goto('/');
  202 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  203 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  204 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  205 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  206 |     await expect(infra).toBeVisible({ timeout: 5000 });
  207 |     // Sleep observed exploration time
  208 |     await page.waitForTimeout(90000);
  209 |     const text = await infra.textContent();
  210 |     expect(text).toMatch(/Complete|Error/);
  211 |     if (text?.includes('Complete')) {
  212 |       expect(text).toMatch(/Total Sites/);
  213 |       expect(text).toMatch(/Warehouses/);
  214 |     } else {
> 215 |       await expect(infra.getByRole('button', { name: /retry/i })).toBeVisible();
      |                                                                   ^ Error: expect(locator).toBeVisible() failed
  216 |     }
  217 |   });
  218 | 
  219 |   test('E1: few sites triggers warning', async ({ page }) => {
  220 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  221 |       status: 200, contentType: 'application/json',
  222 |       body: JSON.stringify({ elements: [
  223 |         { type: 'node', id: 1, tags: { building: 'warehouse', name: 'W1' }, lat: 33.75, lon: -84.39 },
  224 |         { type: 'node', id: 2, tags: { aeroway: 'aerodrome', name: 'Airport' }, lat: 33.64, lon: -84.43 },
  225 |         { type: 'node', id: 3, tags: { railway: 'yard', name: 'Yard' }, lat: 33.52, lon: -86.80 }
  226 |       ]})
  227 |     }));
  228 |     await page.goto('/');
  229 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  230 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  231 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  232 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  233 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  234 |     await expect(infra.getByText(/Few sites found|few facilities/i)).toBeVisible({ timeout: 5000 });
  235 |   });
  236 | 
  237 |   test('E2: duplicates removed and counted', async ({ page }) => {
  238 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  239 |       status: 200, contentType: 'application/json',
  240 |       body: JSON.stringify({ elements: [
  241 |         { type: 'way', id: 1, tags: { building: 'warehouse', name: 'W-A' }, center: { lat: 33.750, lon: -84.390 }, bounds: { minlat: 33.749, minlon: -84.391, maxlat: 33.751, maxlon: -84.389 } },
  242 |         { type: 'way', id: 2, tags: { building: 'warehouse', name: 'W-B' }, center: { lat: 33.7505, lon: -84.3905 }, bounds: { minlat: 33.7495, minlon: -84.3915, maxlat: 33.7515, maxlon: -84.3895 } },
  243 |         { type: 'way', id: 3, tags: { building: 'warehouse', name: 'W-C' }, center: { lat: 33.760, lon: -84.380 }, bounds: { minlat: 33.759, minlon: -84.381, maxlat: 33.761, maxlon: -84.379 } },
  244 |         { type: 'way', id: 4, tags: { aeroway: 'aerodrome', name: 'AP-1' }, center: { lat: 33.640, lon: -84.430 }, bounds: { minlat: 33.630, minlon: -84.440, maxlat: 33.650, maxlon: -84.420 } },
  245 |         { type: 'way', id: 5, tags: { aeroway: 'aerodrome', name: 'AP-2' }, center: { lat: 33.6405, lon: -84.4305 }, bounds: { minlat: 33.6305, minlon: -84.4405, maxlat: 33.6505, maxlon: -84.4205 } },
  246 |         { type: 'way', id: 6, tags: { harbour: 'yes', name: 'Port' }, center: { lat: 32.080, lon: -81.090 }, bounds: { minlat: 32.070, minlon: -81.100, maxlat: 32.090, maxlon: -81.080 } },
  247 |       ]})
  248 |     }));
  249 |     await page.goto('/');
  250 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  251 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  252 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  253 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  254 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  255 |     // 6 injected, 2 pairs of dupes → should show 4 after dedup
  256 |     const text = await infra.textContent();
  257 |     expect(text).toMatch(/[Dd]edup|duplicates removed/);
  258 |   });
  259 | 
  260 |   test('E3: incomplete nodes accepted with default area', async ({ page }) => {
  261 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  262 |       status: 200, contentType: 'application/json',
  263 |       body: JSON.stringify({ elements: [
  264 |         { type: 'node', id: 1, tags: { building: 'warehouse', name: 'Node Warehouse' }, lat: 33.75, lon: -84.39 },
  265 |         { type: 'node', id: 2, tags: { building: 'industrial' }, lat: 33.76, lon: -84.38 },
  266 |       ]})
  267 |     }));
  268 |     await page.goto('/');
  269 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  270 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  271 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  272 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  273 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  274 |     // Nodes get default 50K sqft, should pass minimum threshold
  275 |     const text = await infra.textContent();
  276 |     expect(text).toContain('Total Sites');
  277 |   });
  278 | });
  279 | 
  280 | // ═══════════════════════════════════════════════════
  281 | // Integration
  282 | // ═══════════════════════════════════════════════════
  283 | 
  284 | test.describe('Integration', () => {
  285 |   test('Full flow: all panels reach final state', async ({ page }) => {
  286 |     // Observed: FAF <1s, OSM 30-90s, Infra 20-40s. All run in parallel.
  287 |     // Sleep 90s for the slowest, then verify all panels reached a final state.
  288 |     await page.goto('/');
  289 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  290 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  291 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  292 |     // FAF completes almost instantly
  293 |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  294 |     await expect(faf.getByText('Complete')).toBeVisible({ timeout: 5000 });
  295 |     // Wait for OSM + Infra (real Overpass API)
  296 |     await page.waitForTimeout(90000);
  297 |     // All panels should be in a final state
  298 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  299 |     const osmText = await osm.textContent();
  300 |     expect(osmText).toMatch(/Complete|Error/);
  301 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  302 |     const infraText = await infra.textContent();
  303 |     expect(infraText).toMatch(/Complete|Error/);
  304 |     // Take final screenshot as evidence
  305 |     await page.screenshot({ path: 'tests/e2e/exploration/US-1.0-final-state.png' });
  306 |   });
  307 | });
  308 | 
```