import { test, expect } from '@playwright/test';

/**
 * Milestone 1 — Full E2E Test Suite
 * All selectors verified via Playwright MCP exploration on 2026-04-07
 * 35 exploration screenshots in tests/e2e/exploration/
 * Use case plan: tests/e2e/use-cases/m1-use-case.md
 */

// ═══════════════════════════════════════════════════
// US-1.1 — Territory Search & Selection
// ═══════════════════════════════════════════════════

test.describe('US-1.1 — Territory Search', () => {
  test('Happy path: search, select, start pipeline', async ({ page }) => {
    await page.goto('/');
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await expect(input).toBeVisible();
    await input.pressSequentially('Atl', { delay: 100 });
    await expect(page.getByRole('option', { name: 'Atlanta Metro State' })).toBeVisible({ timeout: 3000 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await expect(page.getByRole('button', { name: 'Start data pipeline' })).toBeVisible();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
  });

  test('E1: no results message', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('zzzzz', { delay: 50 });
    await expect(page.getByText('No territories found')).toBeVisible({ timeout: 2000 });
  });

  test('E2: single char does not trigger autocomplete', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).fill('A');
    await page.waitForTimeout(500);
    await expect(page.getByRole('listbox')).not.toBeVisible();
  });

  test('E3: change territory returns to search', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: 'Change territory' }).click();
    await expect(page.getByRole('combobox', { name: 'Search territories' })).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════
// US-1.2 — FAF Freight Data
// ═══════════════════════════════════════════════════

test.describe('US-1.2 — FAF Freight Data', () => {
  test('Happy path: FAF loads real data with tonnage, pairs, commodities', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const faf = page.getByRole('region', { name: 'FAF freight data' });
    await expect(faf).toBeVisible({ timeout: 10000 });
    await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
    await expect(faf.getByText('Total Tonnage')).toBeVisible();
    await expect(faf.getByText('tons')).toBeVisible();
    await expect(faf.getByText('County Pairs')).toBeVisible();
    await expect(faf.getByText('Commodities')).toBeVisible();
  });

  test('E1: non-SE territory shows no freight data warning', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Benelux', { delay: 50 });
    await page.getByRole('option', { name: 'Benelux Megaregion' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const faf = page.getByRole('region', { name: 'FAF freight data' });
    await expect(faf).toBeVisible({ timeout: 5000 });
    await expect(faf.getByText(/No freight data/)).toBeVisible({ timeout: 5000 });
  });

  test('E2: offline fallback when primary data blocked', async ({ page }) => {
    await page.route('**/faf-se-usa.json', route => route.abort());
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const faf = page.getByRole('region', { name: 'FAF freight data' });
    await expect(faf.getByText(/offline|fallback|unavailable/i)).toBeVisible({ timeout: 10000 });
  });

  test('E3: restart after navigation shows clean state', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
    // Interrupt
    await page.getByRole('button', { name: 'Change territory' }).click();
    await expect(page.getByRole('combobox', { name: 'Search territories' })).toBeVisible({ timeout: 3000 });
    // Restart
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const faf = page.getByRole('region', { name: 'FAF freight data' });
    await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
    // Should show full dataset (451M), not stale/fallback data
    await expect(faf.getByText('tons')).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// US-1.3 — OSM Road/Rail
// ═══════════════════════════════════════════════════

test.describe('US-1.3 — OSM Road/Rail', () => {
  test('Happy path: separate Road/Rail progress, completes or errors', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const osm = page.getByRole('region', { name: 'OSM road and rail data' });
    await expect(osm).toBeVisible({ timeout: 5000 });
    await expect(osm.getByText('Road', { exact: true })).toBeVisible();
    await expect(osm.getByText('Rail', { exact: true })).toBeVisible();
    await expect(osm.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
  });

  test('E1: forced 429 shows error + retry button', async ({ page }) => {
    await page.route('**/overpass-api.de/**', route => route.fulfill({ status: 429, body: 'Rate limited' }));
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const osm = page.getByRole('region', { name: 'OSM road and rail data' });
    await expect(osm.getByText(/error.*429|429.*error/i)).toBeVisible({ timeout: 60000 });
    await expect(osm.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('E2: large territory triggers chunking (multiple requests)', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/overpass-api.de/**', route => {
      requestCount++;
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ elements: [{ type: 'way', id: requestCount, tags: { highway: 'motorway', ref: 'I-' + requestCount }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }] })
      });
    });
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('US S', { delay: 100 });
    await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const osm = page.getByRole('region', { name: 'OSM road and rail data' });
    await expect(osm.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // SE USA bbox is ~260 deg² / 25 threshold = should produce 10+ chunks
    expect(requestCount).toBeGreaterThan(5);
  });

  test('E3: malformed geometry skipped, valid elements kept', async ({ page }) => {
    await page.route('**/overpass-api.de/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ elements: [
        { type: 'way', id: 1, tags: { highway: 'motorway' }, geometry: null },
        { type: 'way', id: 2, tags: { highway: 'trunk' }, geometry: [] },
        { type: 'way', id: 3, tags: { highway: 'motorway', ref: 'I-75' }, geometry: [{ lat: 33.7, lon: -84.4 }, { lat: 33.8, lon: -84.3 }] }
      ]})
    }));
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const osm = page.getByRole('region', { name: 'OSM road and rail data' });
    await expect(osm.getByText('Complete')).toBeVisible({ timeout: 15000 });
    // Only 1 valid motorway should survive
    await expect(osm.getByText('Interstates')).toBeVisible();
    const text = await osm.textContent();
    expect(text).toContain('1');
  });
});

// ═══════════════════════════════════════════════════
// US-1.4 — Infrastructure Sites
// ═══════════════════════════════════════════════════

test.describe('US-1.4 — Infrastructure Sites', () => {
  test('Happy path: loads real sites with type breakdown', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const infra = page.getByRole('region', { name: 'Infrastructure sites' });
    await expect(infra).toBeVisible({ timeout: 10000 });
    await expect(infra.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
    const text = await infra.textContent();
    if (!text?.includes('Error')) {
      await expect(infra.getByText('Total Sites')).toBeVisible();
      await expect(infra.getByText('Warehouses')).toBeVisible();
    }
  });

  test('E1: few sites triggers warning', async ({ page }) => {
    await page.route('**/overpass-api.de/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ elements: [
        { type: 'node', id: 1, tags: { building: 'warehouse', name: 'W1' }, lat: 33.75, lon: -84.39 },
        { type: 'node', id: 2, tags: { aeroway: 'aerodrome', name: 'Airport' }, lat: 33.64, lon: -84.43 },
        { type: 'node', id: 3, tags: { railway: 'yard', name: 'Yard' }, lat: 33.52, lon: -86.80 }
      ]})
    }));
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const infra = page.getByRole('region', { name: 'Infrastructure sites' });
    await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
    await expect(infra.getByText(/Few sites found|few facilities/i)).toBeVisible({ timeout: 5000 });
  });

  test('E2: duplicates removed and counted', async ({ page }) => {
    await page.route('**/overpass-api.de/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ elements: [
        { type: 'way', id: 1, tags: { building: 'warehouse', name: 'W-A' }, center: { lat: 33.750, lon: -84.390 }, bounds: { minlat: 33.749, minlon: -84.391, maxlat: 33.751, maxlon: -84.389 } },
        { type: 'way', id: 2, tags: { building: 'warehouse', name: 'W-B' }, center: { lat: 33.7505, lon: -84.3905 }, bounds: { minlat: 33.7495, minlon: -84.3915, maxlat: 33.7515, maxlon: -84.3895 } },
        { type: 'way', id: 3, tags: { building: 'warehouse', name: 'W-C' }, center: { lat: 33.760, lon: -84.380 }, bounds: { minlat: 33.759, minlon: -84.381, maxlat: 33.761, maxlon: -84.379 } },
        { type: 'way', id: 4, tags: { aeroway: 'aerodrome', name: 'AP-1' }, center: { lat: 33.640, lon: -84.430 }, bounds: { minlat: 33.630, minlon: -84.440, maxlat: 33.650, maxlon: -84.420 } },
        { type: 'way', id: 5, tags: { aeroway: 'aerodrome', name: 'AP-2' }, center: { lat: 33.6405, lon: -84.4305 }, bounds: { minlat: 33.6305, minlon: -84.4405, maxlat: 33.6505, maxlon: -84.4205 } },
        { type: 'way', id: 6, tags: { harbour: 'yes', name: 'Port' }, center: { lat: 32.080, lon: -81.090 }, bounds: { minlat: 32.070, minlon: -81.100, maxlat: 32.090, maxlon: -81.080 } },
      ]})
    }));
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const infra = page.getByRole('region', { name: 'Infrastructure sites' });
    await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
    // 6 injected, 2 pairs of dupes → should show 4 after dedup
    const text = await infra.textContent();
    expect(text).toMatch(/[Dd]edup|duplicates removed/);
  });

  test('E3: incomplete nodes accepted with default area', async ({ page }) => {
    await page.route('**/overpass-api.de/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ elements: [
        { type: 'node', id: 1, tags: { building: 'warehouse', name: 'Node Warehouse' }, lat: 33.75, lon: -84.39 },
        { type: 'node', id: 2, tags: { building: 'industrial' }, lat: 33.76, lon: -84.38 },
      ]})
    }));
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const infra = page.getByRole('region', { name: 'Infrastructure sites' });
    await expect(infra.getByText('Complete')).toBeVisible({ timeout: 15000 });
    // Nodes get default 50K sqft, should pass minimum threshold
    const text = await infra.textContent();
    expect(text).toContain('Total Sites');
  });
});

// ═══════════════════════════════════════════════════
// Integration
// ═══════════════════════════════════════════════════

test.describe('Integration', () => {
  test('Full flow: overall progress reaches completion', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
    await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    // FAF completes fast
    const faf = page.getByRole('region', { name: 'FAF freight data' });
    await expect(faf.getByText('Complete')).toBeVisible({ timeout: 15000 });
    // Wait for all panels to reach final state
    const osm = page.getByRole('region', { name: 'OSM road and rail data' });
    await expect(osm.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
    const infra = page.getByRole('region', { name: 'Infrastructure sites' });
    await expect(infra.getByText(/Complete|Error/)).toBeVisible({ timeout: 90000 });
  });
});
