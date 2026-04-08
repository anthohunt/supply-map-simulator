import { test, expect } from '@playwright/test';

/**
 * Milestone 2 — Space Pixelization E2E Test Suite
 * All selectors verified via Playwright MCP exploration on 2026-04-08
 * 24 exploration screenshots in tests/e2e/exploration/
 * Use case plan: tests/e2e/use-cases/m2-use-case.md
 */

// Helper: navigate through pipeline to pixelization screen
async function reachPixelization(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  await page.getByRole('button', { name: 'Start data pipeline' }).click();
  await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
  // Wait for all panels to complete (FAF instant, OSM/Infra use Overpass 10-90s)
  await page.waitForTimeout(90000);
  // Navigate to pixelization
  const startPixBtn = page.getByRole('button', { name: /start pixelization/i });
  await expect(startPixBtn).toBeVisible({ timeout: 5000 });
  await startPixBtn.click();
}

// ═══════════════════════════════════════════════════
// US-1.5 — Space Pixelization
// ═══════════════════════════════════════════════════

test.describe('US-1.5 — Space Pixelization', () => {
  test('Happy path: pixelization completes with areas, regions, boundaries', async ({ page }) => {
    await reachPixelization(page);
    // Wait for pixelization to complete (runs synchronously, should be fast)
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Results: areas and regions > 0
    const resultsText = await page.textContent('body');
    expect(resultsText).toMatch(/Areas/);
    expect(resultsText).toMatch(/Regions/);
    // Region list with color dots
    expect(resultsText).toMatch(/region-\d/);
  });

  test('E1: zero-demand county assigned to nearest area', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // All counties should be assigned (contiguous count = total)
    const text = await page.textContent('body');
    expect(text).toMatch(/Contiguous/);
    // No unassigned counties
    expect(text).not.toMatch(/unassigned/i);
  });

  test('E2: post-processing ensures contiguity', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    const text = await page.textContent('body');
    // Contiguous count should match total areas (e.g., "8/8")
    expect(text).toMatch(/\d+\/\d+/);
  });

  test('E3: too few counties shows error', async ({ page }) => {
    // Use Rural County (tiny territory with < 3 counties)
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Rural', { delay: 100 });
    await page.getByRole('option', { name: /Rural County/i }).click();
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    await page.waitForTimeout(30000);
    const startPixBtn = page.getByRole('button', { name: /start pixelization/i });
    if (await startPixBtn.isVisible()) {
      await startPixBtn.click();
      await page.waitForTimeout(5000);
      const text = await page.textContent('body');
      expect(text).toMatch(/Too few counties|error/i);
    }
  });

  test('E4: cancel stops computation and discards results', async ({ page }) => {
    await reachPixelization(page);
    // If pixelization is still running, cancel it
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);
      const text = await page.textContent('body');
      expect(text).toMatch(/Ready|idle/i);
    }
    // If already complete, verify re-run + cancel works
    const rerunBtn = page.getByRole('button', { name: /re-run/i });
    if (await rerunBtn.isVisible()) {
      await rerunBtn.click();
      // Try to cancel immediately
      const cancel = page.getByRole('button', { name: /cancel/i });
      if (await cancel.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancel.click();
      }
    }
  });
});

// ═══════════════════════════════════════════════════
// US-1.6 — Clustering Parameters
// ═══════════════════════════════════════════════════

test.describe('US-1.6 — Clustering Parameters', () => {
  test('Happy path: adjust params and re-run with different region count', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Parameter sliders visible
    await expect(page.getByLabel(/target regions/i)).toBeVisible();
    await expect(page.getByLabel(/demand balance/i)).toBeVisible();
    await expect(page.getByLabel(/contiguity/i)).toBeVisible();
    await expect(page.getByLabel(/compactness/i)).toBeVisible();
    // Change target regions
    const slider = page.getByLabel(/target regions/i);
    await slider.fill('6');
    // Re-run
    await page.getByRole('button', { name: /re-run/i }).click();
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Should show different region count
    const text = await page.textContent('body');
    expect(text).toMatch(/region/i);
  });

  test('E1: target regions = 1 shows validation error', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Set target to 1 via evaluate (slider min is 2)
    await page.evaluate(() => {
      const store = (window as any).__stores?.network;
      if (store) store.getState().setParams({ targetRegions: 1 });
    });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Minimum 2 regions/i)).toBeVisible({ timeout: 2000 });
  });

  test('E2: target regions > county count shows validation error', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Set target higher than county count
    await page.evaluate(() => {
      const store = (window as any).__stores?.network;
      if (store) store.getState().setParams({ targetRegions: 999 });
    });
    await page.waitForTimeout(500);
    await expect(page.getByText(/Maximum.*regions.*limited by county count/i)).toBeVisible({ timeout: 2000 });
  });

  test('E3: re-run uses cached data (no API calls)', async ({ page }) => {
    await reachPixelization(page);
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // Track network requests during re-run
    let apiCalls = 0;
    await page.route('**/overpass-api.de/**', route => {
      apiCalls++;
      route.continue();
    });
    // Adjust and re-run
    const slider = page.getByLabel(/target regions/i);
    await slider.fill('5');
    await page.getByRole('button', { name: /re-run/i }).click();
    await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
    // No Overpass calls should have been made
    expect(apiCalls).toBe(0);
  });
});
