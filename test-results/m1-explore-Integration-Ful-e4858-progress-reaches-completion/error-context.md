# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m1-explore.spec.ts >> Integration >> Full flow: overall progress reaches completion
- Location: tests\e2e\m1-explore.spec.ts:267:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'OSM road and rail data' }).getByText(/Complete|Error/)
Expected: visible
Timeout: 90000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 90000ms
  - waiting for getByRole('region', { name: 'OSM road and rail data' }).getByText(/Complete|Error/)

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
        - generic [ref=e14]: 60%
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
            - paragraph [ref=e39]: "Rail data failed: Overpass API error 429 after 5 retries"
            - button "Retry" [ref=e40] [cursor=pointer]
        - region "Infrastructure sites" [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]: Infrastructure Sites
            - generic [ref=e44]: Error
          - paragraph [ref=e45]: Overpass API error 429 after 5 retries
      - button "Change territory" [ref=e46] [cursor=pointer]: Change Territory
  - main [ref=e47]:
    - region "Interactive freight network map" [ref=e48]:
      - generic [ref=e49]:
        - generic:
          - generic [ref=e50]:
            - button "Zoom in" [ref=e51] [cursor=pointer]: +
            - button "Zoom out" [ref=e52] [cursor=pointer]: −
          - generic [ref=e53]:
            - link "Leaflet" [ref=e54] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e55]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e59] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e60] [cursor=pointer]:
              - /url: https://carto.com/
```

# Test source

```ts
  178 | });
  179 | 
  180 | // ═══════════════════════════════════════════════════
  181 | // US-1.4 — Infrastructure Sites
  182 | // ═══════════════════════════════════════════════════
  183 | 
  184 | test.describe('US-1.4 — Infrastructure Sites', () => {
  185 |   test('Happy path: loads real sites with type breakdown', async ({ page }) => {
  186 |     test.setTimeout(120000);
  187 |     await page.goto('/');
  188 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  189 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  190 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  191 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  192 |     await expect(infra).toBeVisible({ timeout: 10000 });
  193 |     await expect(infra.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
  194 |     const text = await infra.textContent();
  195 |     if (!text?.includes('Error')) {
  196 |       await expect(infra.getByText('Total Sites')).toBeVisible();
  197 |       await expect(infra.getByText('Warehouses')).toBeVisible();
  198 |     }
  199 |   });
  200 | 
  201 |   test('E1: few sites triggers warning', async ({ page }) => {
  202 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  203 |       status: 200, contentType: 'application/json',
  204 |       body: JSON.stringify({ elements: [
  205 |         { type: 'node', id: 1, tags: { building: 'warehouse', name: 'W1' }, lat: 33.75, lon: -84.39 },
  206 |         { type: 'node', id: 2, tags: { aeroway: 'aerodrome', name: 'Airport' }, lat: 33.64, lon: -84.43 },
  207 |         { type: 'node', id: 3, tags: { railway: 'yard', name: 'Yard' }, lat: 33.52, lon: -86.80 }
  208 |       ]})
  209 |     }));
  210 |     await page.goto('/');
  211 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  212 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  213 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  214 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  215 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  216 |     await expect(infra.getByText(/Few sites found|few facilities/i)).toBeVisible({ timeout: 5000 });
  217 |   });
  218 | 
  219 |   test('E2: duplicates removed and counted', async ({ page }) => {
  220 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  221 |       status: 200, contentType: 'application/json',
  222 |       body: JSON.stringify({ elements: [
  223 |         { type: 'way', id: 1, tags: { building: 'warehouse', name: 'W-A' }, center: { lat: 33.750, lon: -84.390 }, bounds: { minlat: 33.749, minlon: -84.391, maxlat: 33.751, maxlon: -84.389 } },
  224 |         { type: 'way', id: 2, tags: { building: 'warehouse', name: 'W-B' }, center: { lat: 33.7505, lon: -84.3905 }, bounds: { minlat: 33.7495, minlon: -84.3915, maxlat: 33.7515, maxlon: -84.3895 } },
  225 |         { type: 'way', id: 3, tags: { building: 'warehouse', name: 'W-C' }, center: { lat: 33.760, lon: -84.380 }, bounds: { minlat: 33.759, minlon: -84.381, maxlat: 33.761, maxlon: -84.379 } },
  226 |         { type: 'way', id: 4, tags: { aeroway: 'aerodrome', name: 'AP-1' }, center: { lat: 33.640, lon: -84.430 }, bounds: { minlat: 33.630, minlon: -84.440, maxlat: 33.650, maxlon: -84.420 } },
  227 |         { type: 'way', id: 5, tags: { aeroway: 'aerodrome', name: 'AP-2' }, center: { lat: 33.6405, lon: -84.4305 }, bounds: { minlat: 33.6305, minlon: -84.4405, maxlat: 33.6505, maxlon: -84.4205 } },
  228 |         { type: 'way', id: 6, tags: { harbour: 'yes', name: 'Port' }, center: { lat: 32.080, lon: -81.090 }, bounds: { minlat: 32.070, minlon: -81.100, maxlat: 32.090, maxlon: -81.080 } },
  229 |       ]})
  230 |     }));
  231 |     await page.goto('/');
  232 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  233 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  234 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  235 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  236 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  237 |     // 6 injected, 2 pairs of dupes → should show 4 after dedup
  238 |     const text = await infra.textContent();
  239 |     expect(text).toMatch(/[Dd]edup|duplicates removed/);
  240 |   });
  241 | 
  242 |   test('E3: incomplete nodes accepted with default area', async ({ page }) => {
  243 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  244 |       status: 200, contentType: 'application/json',
  245 |       body: JSON.stringify({ elements: [
  246 |         { type: 'node', id: 1, tags: { building: 'warehouse', name: 'Node Warehouse' }, lat: 33.75, lon: -84.39 },
  247 |         { type: 'node', id: 2, tags: { building: 'industrial' }, lat: 33.76, lon: -84.38 },
  248 |       ]})
  249 |     }));
  250 |     await page.goto('/');
  251 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  252 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  253 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  254 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  255 |     await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
  256 |     // Nodes get default 50K sqft, should pass minimum threshold
  257 |     const text = await infra.textContent();
  258 |     expect(text).toContain('Total Sites');
  259 |   });
  260 | });
  261 | 
  262 | // ═══════════════════════════════════════════════════
  263 | // Integration
  264 | // ═══════════════════════════════════════════════════
  265 | 
  266 | test.describe('Integration', () => {
  267 |   test('Full flow: overall progress reaches completion', async ({ page }) => {
  268 |     test.setTimeout(120000);
  269 |     await page.goto('/');
  270 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  271 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  272 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  273 |     // FAF completes fast
  274 |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  275 |     await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
  276 |     // Wait for all panels to reach final state
  277 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
> 278 |     await expect(osm.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  279 |     const infra = page.getByRole('region', { name: 'Infrastructure sites' });
  280 |     await expect(infra.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
  281 |   });
  282 | });
  283 | 
```