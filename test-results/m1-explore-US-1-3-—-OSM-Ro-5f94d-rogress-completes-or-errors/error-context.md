# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m1-explore.spec.ts >> US-1.3 — OSM Road/Rail >> Happy path: separate Road/Rail progress, completes or errors
- Location: tests\e2e\m1-explore.spec.ts:115:3

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
            - generic [ref=e37]: Loading
          - generic [ref=e38]:
            - generic [ref=e40]: Road
            - generic [ref=e44]: Rail
        - region "Infrastructure sites" [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]: Infrastructure Sites
            - generic [ref=e49]: Error
          - paragraph [ref=e50]: Overpass API error 429 after 5 retries
      - button "Change territory" [ref=e51] [cursor=pointer]: Change Territory
  - main [ref=e52]:
    - region "Interactive freight network map" [ref=e53]:
      - generic [ref=e54]:
        - generic:
          - generic [ref=e55]:
            - button "Zoom in" [ref=e56] [cursor=pointer]: +
            - button "Zoom out" [ref=e57] [cursor=pointer]: −
          - generic [ref=e58]:
            - link "Leaflet" [ref=e59] [cursor=pointer]:
              - /url: https://leafletjs.com
              - img [ref=e60]
              - text: Leaflet
            - text: "| ©"
            - link "OpenStreetMap" [ref=e64] [cursor=pointer]:
              - /url: https://www.openstreetmap.org/copyright
            - text: ©
            - link "CARTO" [ref=e65] [cursor=pointer]:
              - /url: https://carto.com/
```

# Test source

```ts
  25  |   });
  26  | 
  27  |   test('E1: no results message', async ({ page }) => {
  28  |     await page.goto('/');
  29  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('zzzzz', { delay: 50 });
  30  |     await expect(page.getByText('No territories found')).toBeVisible({ timeout: 2000 });
  31  |   });
  32  | 
  33  |   test('E2: single char does not trigger autocomplete', async ({ page }) => {
  34  |     await page.goto('/');
  35  |     await page.getByRole('combobox', { name: 'Search territories' }).fill('A');
  36  |     await page.waitForTimeout(500);
  37  |     await expect(page.getByRole('listbox')).not.toBeVisible();
  38  |   });
  39  | 
  40  |   test('E3: change territory returns to search', async ({ page }) => {
  41  |     await page.goto('/');
  42  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  43  |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  44  |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  45  |     await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
  46  |     await page.getByRole('button', { name: 'Change territory' }).click();
  47  |     await expect(page.getByRole('combobox', { name: 'Search territories' })).toBeVisible({ timeout: 3000 });
  48  |   });
  49  | });
  50  | 
  51  | // ═══════════════════════════════════════════════════
  52  | // US-1.2 — FAF Freight Data
  53  | // ═══════════════════════════════════════════════════
  54  | 
  55  | test.describe('US-1.2 — FAF Freight Data', () => {
  56  |   test('Happy path: FAF loads real data with tonnage, pairs, commodities', async ({ page }) => {
  57  |     await page.goto('/');
  58  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  59  |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  60  |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  61  |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  62  |     await expect(faf).toBeVisible({ timeout: 10000 });
  63  |     await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
  64  |     await expect(faf.getByText('Total Tonnage')).toBeVisible();
  65  |     await expect(faf.getByText('tons')).toBeVisible();
  66  |     await expect(faf.getByText('County Pairs')).toBeVisible();
  67  |     await expect(faf.getByText('Commodities')).toBeVisible();
  68  |   });
  69  | 
  70  |   test('E1: non-SE territory shows no freight data warning', async ({ page }) => {
  71  |     await page.goto('/');
  72  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Benelux', { delay: 50 });
  73  |     await page.getByRole('option', { name: 'Benelux Megaregion' }).click();
  74  |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  75  |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  76  |     await expect(faf).toBeVisible({ timeout: 5000 });
  77  |     await expect(faf.getByText(/No freight data/)).toBeVisible({ timeout: 5000 });
  78  |   });
  79  | 
  80  |   test('E2: offline fallback when primary data blocked', async ({ page }) => {
  81  |     await page.route('**/faf-se-usa.json', route => route.abort());
  82  |     await page.goto('/');
  83  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  84  |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  85  |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  86  |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  87  |     await expect(faf.getByText(/offline|fallback|unavailable/i)).toBeVisible({ timeout: 10000 });
  88  |   });
  89  | 
  90  |   test('E3: restart after navigation shows clean state', async ({ page }) => {
  91  |     await page.goto('/');
  92  |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  93  |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  94  |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  95  |     await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
  96  |     // Interrupt
  97  |     await page.getByRole('button', { name: 'Change territory' }).click();
  98  |     await expect(page.getByRole('combobox', { name: 'Search territories' })).toBeVisible({ timeout: 3000 });
  99  |     // Restart
  100 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  101 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  102 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  103 |     const faf = page.getByRole('region', { name: 'FAF freight data' });
  104 |     await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
  105 |     // Should show full dataset (451M), not stale/fallback data
  106 |     await expect(faf.getByText('tons')).toBeVisible();
  107 |   });
  108 | });
  109 | 
  110 | // ═══════════════════════════════════════════════════
  111 | // US-1.3 — OSM Road/Rail
  112 | // ═══════════════════════════════════════════════════
  113 | 
  114 | test.describe('US-1.3 — OSM Road/Rail', () => {
  115 |   test('Happy path: separate Road/Rail progress, completes or errors', async ({ page }) => {
  116 |     test.setTimeout(120000);
  117 |     await page.goto('/');
  118 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  119 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  120 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  121 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  122 |     await expect(osm).toBeVisible({ timeout: 5000 });
  123 |     await expect(osm.getByText('Road', { exact: true })).toBeVisible();
  124 |     await expect(osm.getByText('Rail', { exact: true })).toBeVisible();
> 125 |     await expect(osm.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  126 |   });
  127 | 
  128 |   test('E1: forced 429 shows error + retry button', async ({ page }) => {
  129 |     await page.route('**/overpass-api.de/**', route => route.fulfill({ status: 429, body: 'Rate limited' }));
  130 |     await page.goto('/');
  131 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  132 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  133 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  134 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  135 |     await expect(osm.getByText(/error.*429|429.*error/i)).toBeVisible({ timeout: 60000 });
  136 |     await expect(osm.getByRole('button', { name: /retry/i })).toBeVisible();
  137 |   });
  138 | 
  139 |   test('E2: large territory triggers chunking (multiple requests)', async ({ page }) => {
  140 |     let requestCount = 0;
  141 |     await page.route('**/overpass-api.de/**', route => {
  142 |       requestCount++;
  143 |       route.fulfill({
  144 |         status: 200, contentType: 'application/json',
  145 |         body: JSON.stringify({ elements: [{ type: 'way', id: requestCount, tags: { highway: 'motorway', ref: 'I-' + requestCount }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }] })
  146 |       });
  147 |     });
  148 |     await page.goto('/');
  149 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('US S', { delay: 100 });
  150 |     await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
  151 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  152 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  153 |     await expect(osm.getByText('Complete')).toBeVisible({ timeout: 30000 });
  154 |     // SE USA bbox is ~260 deg² / 25 threshold = should produce 10+ chunks
  155 |     expect(requestCount).toBeGreaterThan(5);
  156 |   });
  157 | 
  158 |   test('E3: malformed geometry skipped, valid elements kept', async ({ page }) => {
  159 |     await page.route('**/overpass-api.de/**', route => route.fulfill({
  160 |       status: 200, contentType: 'application/json',
  161 |       body: JSON.stringify({ elements: [
  162 |         { type: 'way', id: 1, tags: { highway: 'motorway' }, geometry: null },
  163 |         { type: 'way', id: 2, tags: { highway: 'trunk' }, geometry: [] },
  164 |         { type: 'way', id: 3, tags: { highway: 'motorway', ref: 'I-75' }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }
  165 |       ]})
  166 |     }));
  167 |     await page.goto('/');
  168 |     await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  169 |     await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  170 |     await page.getByRole('button', { name: 'Start data pipeline' }).click();
  171 |     const osm = page.getByRole('region', { name: 'OSM road and rail data' });
  172 |     await expect(osm.getByText('Complete')).toBeVisible({ timeout: 15000 });
  173 |     // Only 1 valid motorway should survive
  174 |     await expect(osm.getByText('Interstates')).toBeVisible();
  175 |     const text = await osm.textContent();
  176 |     expect(text).toContain('1');
  177 |   });
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
```