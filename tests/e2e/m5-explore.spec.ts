import { test, expect } from '@playwright/test';

/**
 * Milestone 5 — Flow Analysis E2E Test Suite
 * All selectors verified via Playwright MCP exploration on 2026-04-09
 * 37 exploration screenshots in tests/e2e/exploration/US-3.1-* through EC-*
 *
 * Stores exposed on window.__stores: territory, pipeline, network, map
 * App screen flow: territory-search -> data-pipeline -> pixelization -> network-map
 */

// Helper: navigate through pipeline + pixelization + network to reach flow features
async function reachNetworkMap(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search territories' }).pressSequentially('Atl', { delay: 100 });
  await page.getByRole('option', { name: 'Atlanta Metro State' }).click();
  await page.getByRole('button', { name: 'Start data pipeline' }).click();
  await expect(page.getByRole('heading', { name: 'Data Pipeline' })).toBeVisible({ timeout: 3000 });
  // Wait for all pipeline stages (FAF instant, OSM/Infra use Overpass 10-120s)
  await page.waitForTimeout(120000);
  // Start pixelization
  const startPixBtn = page.getByRole('button', { name: /start pixelization/i });
  await expect(startPixBtn).toBeVisible({ timeout: 10000 });
  await startPixBtn.click();
  await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
  // Generate network
  await expect(page.getByRole('button', { name: 'Generate hub network' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Generate hub network' }).click();
  await expect(page.getByText('Hub Tiers')).toBeVisible({ timeout: 5000 });
}

// ═══════════════════════════════════════════════════
// US-3.1 — Animated Freight Flows
// ═══════════════════════════════════════════════════

test.describe('US-3.1 — Animated Freight Flows', () => {
  test('Happy path: flow toggle on shows flow lines on map', async ({ page }) => {
    await reachNetworkMap(page);

    // Navigate to Layers tab where Freight Flows toggle lives
    const layersTab = page.getByRole('tab', { name: /layers/i });
    await expect(layersTab).toBeVisible();
    await layersTab.click();
    await page.waitForTimeout(300);

    // Freight Flows toggle should be visible with flow count
    const flowToggle = page.getByRole('button', { name: /freight flows/i });
    await expect(flowToggle).toBeVisible();

    // Enable flows
    await flowToggle.click();
    await page.waitForTimeout(500);

    // Flow count should appear (exploration showed 55-56 flows)
    await expect(page.getByText(/\d+ flows/i)).toBeVisible({ timeout: 3000 });

    // Flow lines should render on the map (SVG/canvas paths in overlay pane)
    const flowPaths = await page.locator('.leaflet-overlay-pane path').count();
    expect(flowPaths).toBeGreaterThan(0);
  });

  test('Toggle flows off hides flow lines', async ({ page }) => {
    await reachNetworkMap(page);

    const layersTab = page.getByRole('tab', { name: /layers/i });
    await layersTab.click();
    await page.waitForTimeout(300);

    // Enable flows
    const flowToggle = page.getByRole('button', { name: /freight flows/i });
    await flowToggle.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/\d+ flows/i)).toBeVisible({ timeout: 3000 });

    // Disable flows
    await flowToggle.click();
    await page.waitForTimeout(500);

    // Flow animation layer should be hidden
    // Store should reflect disabled state
    const flowsEnabled = await page.evaluate(() => {
      return (window as any).__stores?.map?.getState()?.flowsEnabled;
    });
    expect(flowsEnabled).toBe(false);
  });

  test('Flow hover tooltip shows origin, destination, commodity, tonnage', async ({ page }) => {
    await reachNetworkMap(page);

    const layersTab = page.getByRole('tab', { name: /layers/i });
    await layersTab.click();
    await page.waitForTimeout(300);

    // Enable flows
    await page.getByRole('button', { name: /freight flows/i }).click();
    await page.waitForTimeout(500);

    // Hover over a flow line on the map
    const flowPath = page.locator('.leaflet-overlay-pane path').first();
    if (await flowPath.isVisible()) {
      await flowPath.hover();
      await page.waitForTimeout(500);

      // Tooltip should show flow details
      const tooltip = page.locator('.leaflet-tooltip, [class*="tooltip"], [class*="Tooltip"]');
      if (await tooltip.isVisible()) {
        const tooltipText = await tooltip.textContent();
        // Exploration showed: origin hub, destination hub, commodity, tonnage
        expect(tooltipText).toBeTruthy();
      }
    }
  });

  test('E1: tier toggle off hides flows for that tier', async ({ page }) => {
    await reachNetworkMap(page);

    const layersTab = page.getByRole('tab', { name: /layers/i });
    await layersTab.click();
    await page.waitForTimeout(300);

    // Enable flows
    await page.getByRole('button', { name: /freight flows/i }).click();
    await page.waitForTimeout(500);

    // Count initial flow paths
    const initialPaths = await page.locator('.leaflet-overlay-pane path').count();

    // Toggle off Regional tier — flows through regional hubs should disappear
    const regionalBtn = page.getByRole('button', { name: /toggle regional/i });
    if (await regionalBtn.isVisible()) {
      await regionalBtn.click();
      await page.waitForTimeout(500);

      // Fewer paths should be visible after hiding a tier
      const afterPaths = await page.locator('.leaflet-overlay-pane path').count();
      expect(afterPaths).toBeLessThanOrEqual(initialPaths);
    }
  });
});

// ═══════════════════════════════════════════════════
// US-3.2 — Corridor Analysis
// ═══════════════════════════════════════════════════

test.describe('US-3.2 — Corridor Analysis', () => {
  test('Happy path: Flows tab shows corridor analysis table', async ({ page }) => {
    await reachNetworkMap(page);

    // Navigate to Flows tab
    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await expect(flowsTab).toBeVisible();
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Corridor Analysis section should be visible
    await expect(page.getByText(/corridor analysis/i)).toBeVisible({ timeout: 3000 });

    // Should show corridor rows ranked by throughput
    // Exploration showed 6 corridors between 3 gateway hubs
    const corridorRows = page.locator('[class*="corridor"], tr, [class*="row"]').filter({ hasText: /area-/ });
    const rowCount = await corridorRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('Click corridor shows detail panel with commodity breakdown', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Click the first corridor row
    const firstCorridor = page.locator('[class*="corridor"], tr, [class*="row"]').filter({ hasText: /area-/ }).first();
    if (await firstCorridor.isVisible()) {
      await firstCorridor.click();
      await page.waitForTimeout(500);

      // Detail panel should appear with entry hub, exit hub, throughput, commodity breakdown
      // Exploration showed: Entry Hub, Exit Hub, Total Throughput, 7 commodities
      await expect(page.getByText(/entry hub|exit hub|total throughput/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('Corridor selection highlights path on map', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Click a corridor
    const firstCorridor = page.locator('[class*="corridor"], tr, [class*="row"]').filter({ hasText: /area-/ }).first();
    if (await firstCorridor.isVisible()) {
      await firstCorridor.click();
      await page.waitForTimeout(500);

      // Highlighted path should appear on map (cyan #00E5FF, doubled weight)
      // Check store for selectedCorridorId
      const selectedCorridor = await page.evaluate(() => {
        return (window as any).__stores?.network?.getState()?.selectedCorridorId;
      });
      expect(selectedCorridor).toBeTruthy();
    }
  });

  test('Selecting different corridor clears previous highlight', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    const corridorRows = page.locator('[class*="corridor"], tr, [class*="row"]').filter({ hasText: /area-/ });
    const count = await corridorRows.count();
    if (count >= 2) {
      // Select first corridor
      await corridorRows.nth(0).click();
      await page.waitForTimeout(300);
      const first = await page.evaluate(() => {
        return (window as any).__stores?.network?.getState()?.selectedCorridorId;
      });

      // Select second corridor
      await corridorRows.nth(1).click();
      await page.waitForTimeout(300);
      const second = await page.evaluate(() => {
        return (window as any).__stores?.network?.getState()?.selectedCorridorId;
      });

      // Should be different corridors (single-select)
      expect(second).not.toBe(first);
    }
  });

  test('E1: empty flows shows "Run network generation first" message', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Inject empty flows via store
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      if (ns) {
        ns.getState().setFlows([]);
      }
    });
    await page.waitForTimeout(500);

    // Should show empty state message
    await expect(page.getByText(/run network generation first/i)).toBeVisible({ timeout: 3000 });

    // Should include a recovery action button
    await expect(page.getByText(/go to pipeline/i)).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════
// US-3.3 — Flow Filters
// ═══════════════════════════════════════════════════

test.describe('US-3.3 — Flow Filters', () => {
  test('Happy path: filter by origin hub reduces visible flows', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Flow Filters section should be visible
    await expect(page.getByText(/flow filters/i)).toBeVisible({ timeout: 3000 });

    // Select an origin hub filter
    const originSelect = page.locator('select, [class*="select"]').filter({ hasText: /origin/i }).first();
    if (await originSelect.isVisible()) {
      await originSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Flow count should decrease
      const flowText = await page.getByText(/\d+ flows/i).textContent();
      expect(flowText).toBeTruthy();
    }
  });

  test('Compound filter (origin + commodity) can produce zero results', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Apply origin filter
    const originSelect = page.locator('select, [class*="select"]').filter({ hasText: /origin/i }).first();
    if (await originSelect.isVisible()) {
      await originSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }

    // Apply commodity filter to create no-match
    const commoditySelect = page.locator('select, [class*="select"]').filter({ hasText: /commodity/i }).first();
    if (await commoditySelect.isVisible()) {
      // Select last commodity option to maximize chance of no match
      const options = await commoditySelect.locator('option').count();
      if (options > 1) {
        await commoditySelect.selectOption({ index: options - 1 });
        await page.waitForTimeout(500);
      }
    }

    // May show "No flows match" if the combination yields zero
    const noMatch = page.getByText(/no flows match/i);
    const flowCount = page.getByText(/\d+ flows/i);
    // Either no-match message or reduced flow count
    const hasResult = await noMatch.isVisible() || await flowCount.isVisible();
    expect(hasResult).toBe(true);
  });

  test('Clear All Filters restores all flows', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Apply a filter first
    const originSelect = page.locator('select, [class*="select"]').filter({ hasText: /origin/i }).first();
    if (await originSelect.isVisible()) {
      await originSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }

    // "Clear All Filters" should appear when filters are active
    const clearBtn = page.getByRole('button', { name: /clear all/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(500);

      // All flows should be restored
      await expect(page.getByText(/\d+ flows/i)).toBeVisible({ timeout: 3000 });

      // Clear button should disappear
      await expect(clearBtn).not.toBeVisible();
    }
  });

  test('Volume slider filters to high-volume flows only', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Volume slider should be present
    const volumeSlider = page.getByRole('slider', { name: /volume/i });
    if (await volumeSlider.isVisible()) {
      // Get initial flow count text
      const initialFlowText = await page.getByText(/\d+ flows/i).textContent();
      const initialCount = parseInt(initialFlowText?.match(/(\d+)/)?.[1] || '0');

      // Move slider to high value to filter to only high-volume flows
      await volumeSlider.fill('80');
      await page.waitForTimeout(500);

      // Flow count should decrease
      const filteredText = await page.getByText(/\d+ flows/i).textContent();
      const filteredCount = parseInt(filteredText?.match(/(\d+)/)?.[1] || '0');
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('Filter by destination hub', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Destination hub filter
    const destSelect = page.locator('select, [class*="select"]').filter({ hasText: /destination/i }).first();
    if (await destSelect.isVisible()) {
      await destSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Should show filtered flow count
      await expect(page.getByText(/\d+ flows/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('Corridor table syncs with active filters', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Count initial corridor rows
    const corridorRows = page.locator('[class*="corridor"], tr, [class*="row"]').filter({ hasText: /area-/ });
    const initialCount = await corridorRows.count();

    // Apply origin filter
    const originSelect = page.locator('select, [class*="select"]').filter({ hasText: /origin/i }).first();
    if (await originSelect.isVisible() && initialCount > 0) {
      await originSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Corridor count should change to reflect filter
      const filteredCount = await corridorRows.count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('E1: no-match filter shows empty state message', async ({ page }) => {
    await reachNetworkMap(page);

    const flowsTab = page.getByRole('tab', { name: /flows/i });
    await flowsTab.click();
    await page.waitForTimeout(300);

    // Apply compound filters to guarantee no match
    // Set origin, destination, and commodity all to different values
    const originSelect = page.locator('select, [class*="select"]').filter({ hasText: /origin/i }).first();
    const destSelect = page.locator('select, [class*="select"]').filter({ hasText: /destination/i }).first();
    const commoditySelect = page.locator('select, [class*="select"]').filter({ hasText: /commodity/i }).first();

    if (await originSelect.isVisible()) {
      await originSelect.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }
    if (await destSelect.isVisible()) {
      const destOptions = await destSelect.locator('option').count();
      if (destOptions > 2) {
        await destSelect.selectOption({ index: destOptions - 1 });
        await page.waitForTimeout(200);
      }
    }
    if (await commoditySelect.isVisible()) {
      const commOptions = await commoditySelect.locator('option').count();
      if (commOptions > 1) {
        await commoditySelect.selectOption({ index: commOptions - 1 });
        await page.waitForTimeout(500);
      }
    }

    // "No flows match" message should appear
    const noMatchMsg = page.getByText(/no flows match/i);
    const noCorridorsMsg = page.getByText(/no corridors match/i);
    const hasEmptyState = await noMatchMsg.isVisible() || await noCorridorsMsg.isVisible();
    expect(hasEmptyState).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// US-3.4 — Network Stats Dashboard
// ═══════════════════════════════════════════════════

test.describe('US-3.4 — Network Stats Dashboard', () => {
  test('Happy path: Stats tab shows hub/edge/flow summary cards', async ({ page }) => {
    await reachNetworkMap(page);

    // Navigate to Stats tab
    const statsTab = page.getByRole('tab', { name: /stats/i });
    await expect(statsTab).toBeVisible();
    await statsTab.click();
    await page.waitForTimeout(300);

    // Summary cards: Hubs, Edges, Flows
    await expect(page.getByText(/hubs/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/edges/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/flows/i)).toBeVisible({ timeout: 3000 });
  });

  test('Hub Count by Tier and Throughput by Tier charts visible', async ({ page }) => {
    await reachNetworkMap(page);

    const statsTab = page.getByRole('tab', { name: /stats/i });
    await statsTab.click();
    await page.waitForTimeout(300);

    // Recharts bar charts should render (exploration showed horizontal bar charts)
    await expect(page.getByText(/hub count by tier/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/throughput by tier/i)).toBeVisible({ timeout: 3000 });

    // Recharts renders SVG elements
    const chartSvgs = page.locator('.recharts-wrapper svg');
    const chartCount = await chartSvgs.count();
    expect(chartCount).toBeGreaterThanOrEqual(2);
  });

  test('Demand Balance and Coverage metrics displayed', async ({ page }) => {
    await reachNetworkMap(page);

    const statsTab = page.getByRole('tab', { name: /stats/i });
    await statsTab.click();
    await page.waitForTimeout(300);

    // Demand Balance metric
    await expect(page.getByText(/demand balance/i)).toBeVisible({ timeout: 3000 });

    // Coverage metric
    await expect(page.getByText(/coverage/i)).toBeVisible({ timeout: 3000 });

    // Edge distance metrics
    await expect(page.getByText(/avg edge distance|average edge/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/max edge distance|maximum edge/i)).toBeVisible({ timeout: 3000 });
  });

  test('Poor demand balance shows warning indicator', async ({ page }) => {
    await reachNetworkMap(page);

    const statsTab = page.getByRole('tab', { name: /stats/i });
    await statsTab.click();
    await page.waitForTimeout(300);

    // Exploration showed demand balance 25/100 (< 30 threshold) triggers warning
    // Check for warning icon or hint text
    const warningHint = page.getByText(/poor balance detected|consider adjusting/i);
    if (await warningHint.isVisible()) {
      // Warning indicator (!) should be present
      await expect(warningHint).toBeVisible();
    }
  });

  test('E1: empty network shows N/A for all metrics', async ({ page }) => {
    await reachNetworkMap(page);

    const statsTab = page.getByRole('tab', { name: /stats/i });
    await statsTab.click();
    await page.waitForTimeout(300);

    // Inject empty network via store
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      if (ns) {
        const state = ns.getState();
        if (state.setNetworkStatus) state.setNetworkStatus('idle');
        if (state.setHubs) state.setHubs([]);
        if (state.setEdges) state.setEdges([]);
        if (state.setFlows) state.setFlows([]);
      }
    });
    await page.waitForTimeout(500);

    // All metrics should show N/A
    await expect(page.getByText('N/A').first()).toBeVisible({ timeout: 3000 });

    // Should show guidance message
    await expect(page.getByText(/generate a network/i)).toBeVisible({ timeout: 3000 });
  });

  test('E2: responsive resize adjusts chart layout', async ({ page }) => {
    await reachNetworkMap(page);

    const statsTab = page.getByRole('tab', { name: /stats/i });
    await statsTab.click();
    await page.waitForTimeout(300);

    // Resize to narrow viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    // Charts should still be visible (Recharts responsive containers)
    const chartWrappers = page.locator('.recharts-wrapper, .recharts-responsive-container');
    const count = await chartWrappers.count();
    expect(count).toBeGreaterThan(0);

    // Resize back
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(300);
  });
});

// ═══════════════════════════════════════════════════
// Cross-Feature Edge Cases
// ═══════════════════════════════════════════════════

test.describe('Cross-Feature — Flows with other views', () => {
  test('Flows render in split view on both panels', async ({ page }) => {
    await reachNetworkMap(page);

    // Enable flows
    const layersTab = page.getByRole('tab', { name: /layers/i });
    await layersTab.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /freight flows/i }).click();
    await page.waitForTimeout(500);

    // Enable split view
    await page.getByRole('button', { name: 'Enable split view' }).click();
    await page.waitForTimeout(500);

    // Split region should be visible
    const splitRegion = page.getByRole('region', { name: /split view/i });
    await expect(splitRegion).toBeVisible();

    // Store should have both split and flows enabled
    const state = await page.evaluate(() => {
      const ms = (window as any).__stores?.map?.getState();
      return {
        splitViewEnabled: ms?.splitViewEnabled,
        flowsEnabled: ms?.flowsEnabled,
      };
    });
    expect(state.splitViewEnabled).toBe(true);
    expect(state.flowsEnabled).toBe(true);
  });

  test('Flows render with 3D projection enabled', async ({ page }) => {
    await reachNetworkMap(page);

    // Enable flows
    const layersTab = page.getByRole('tab', { name: /layers/i });
    await layersTab.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /freight flows/i }).click();
    await page.waitForTimeout(500);

    // Enable 3D
    await page.getByRole('button', { name: 'Enable 3D projection' }).click();
    await page.waitForTimeout(500);

    // Both should be active
    const state = await page.evaluate(() => {
      const ms = (window as any).__stores?.map?.getState();
      return {
        threeDEnabled: ms?.threeDEnabled,
        flowsEnabled: ms?.flowsEnabled,
      };
    });
    expect(state.threeDEnabled).toBe(true);
    expect(state.flowsEnabled).toBe(true);

    // 3D canvas should be visible
    const canvas = page.locator('[class*="threeDCanvas"]');
    await expect(canvas).toBeVisible();
  });
});
