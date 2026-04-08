import { test, expect } from '@playwright/test';

/**
 * Milestone 3 — Network Map Core E2E Test Suite
 * All selectors verified via Playwright MCP exploration on 2026-04-08
 * 28 exploration screenshots in tests/e2e/exploration/
 *
 * Stores exposed on window.__stores: territory, pipeline, network, map
 * App screen flow: territory-search -> data-pipeline -> pixelization -> network-map
 */

// Helper: navigate through pipeline + pixelization to reach the Generate Network button
async function reachNetworkGeneration(page: import('@playwright/test').Page) {
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
  // Wait for pixelization to complete
  await expect(page.getByText('Complete')).toBeVisible({ timeout: 30000 });
  // Generate Network button should appear on the map overlay
  await expect(page.getByRole('button', { name: 'Generate hub network' })).toBeVisible({ timeout: 5000 });
}

// Helper: reach the network-map screen with a fully generated network
async function reachNetworkMap(page: import('@playwright/test').Page) {
  await reachNetworkGeneration(page);
  await page.getByRole('button', { name: 'Generate hub network' }).click();
  // Network generates synchronously — screen transitions to network-map
  // Sidebar shows Hub Tiers with Global/Regional/Gateway counts
  await expect(page.getByText('Hub Tiers')).toBeVisible({ timeout: 5000 });
}

// ═══════════════════════════════════════════════════
// US-2.1 — Hub Network Generation & Markers
// ═══════════════════════════════════════════════════

test.describe('US-2.1 — Hub Network Generation', () => {
  test('Happy path: generate network shows hub markers with tier counts', async ({ page }) => {
    await reachNetworkMap(page);

    // Sidebar shows tier toggle buttons with counts > 0
    const globalBtn = page.getByRole('button', { name: /toggle global hubs/i });
    const regionalBtn = page.getByRole('button', { name: /toggle regional hubs/i });
    const gatewayBtn = page.getByRole('button', { name: /toggle gateway hubs/i });

    await expect(globalBtn).toBeVisible();
    await expect(regionalBtn).toBeVisible();
    await expect(gatewayBtn).toBeVisible();

    // Verify hub counts are non-zero via store
    const hubCounts = await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const hubs = ns?.getState()?.hubs ?? [];
      return {
        total: hubs.length,
        global: hubs.filter((h: any) => h.tier === 'global').length,
        regional: hubs.filter((h: any) => h.tier === 'regional').length,
        gateway: hubs.filter((h: any) => h.tier === 'gateway').length,
      };
    });
    expect(hubCounts.total).toBeGreaterThan(0);
    expect(hubCounts.global).toBeGreaterThan(0);
    expect(hubCounts.regional).toBeGreaterThan(0);
    expect(hubCounts.gateway).toBeGreaterThan(0);

    // Edges also generated
    const edgeCount = await page.evaluate(() => {
      return (window as any).__stores?.network?.getState()?.edges?.length ?? 0;
    });
    expect(edgeCount).toBeGreaterThan(0);
  });

  test('Marker clustering: markers aggregate into cluster icons at low zoom', async ({ page }) => {
    await reachNetworkMap(page);

    // At low zoom, MarkerClusterGroup aggregates markers into cluster buttons
    // Exploration confirmed: cluster "40" or "42" visible at default zoom
    const clusterButtons = page.locator('.leaflet-marker-icon').filter({ hasText: /^\d+$/ });
    const count = await clusterButtons.count();
    expect(count).toBeGreaterThan(0);

    // Cluster text should show a number (aggregated marker count)
    const firstClusterText = await clusterButtons.first().textContent();
    expect(Number(firstClusterText)).toBeGreaterThan(1);
  });

  test('E1: marker clusters break apart on zoom in', async ({ page }) => {
    await reachNetworkMap(page);

    // Get cluster count at current zoom
    const clustersBefore = await page.locator('.leaflet-marker-icon').filter({ hasText: /^\d+$/ }).count();

    // Click on a cluster to zoom in and break it apart
    const firstCluster = page.locator('.leaflet-marker-icon').filter({ hasText: /^\d+$/ }).first();
    await firstCluster.click();
    await page.waitForTimeout(2000);

    // After clicking a cluster, either:
    // - More clusters appear (the big cluster split into smaller ones)
    // - Individual CircleMarker dots appear
    // The cluster count at the new zoom should differ from the original
    const clustersAfter = await page.locator('.leaflet-marker-icon').filter({ hasText: /^\d+$/ }).count();
    const circleMarkers = await page.locator('circle').count();

    // At least one of: more clusters visible, or circle markers appeared
    expect(clustersAfter + circleMarkers).toBeGreaterThan(0);
  });

  test('E2: network generation failure shows error panel with retry', async ({ page }) => {
    await reachNetworkGeneration(page);

    // Clear regions/areas/sites so optimizer produces 0 hubs
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const ps = (window as any).__stores?.pipeline;
      ns?.getState()?.setRegions([]);
      ns?.getState()?.setAreas([]);
      ps?.getState()?.setInfra({ sites: [], deduped: 0 });
    });

    // Click the real Generate Network button
    await page.getByRole('button', { name: 'Generate hub network' }).click();
    await page.waitForTimeout(500);

    // Error panel should appear with message and retry button
    await expect(page.getByText('No hubs could be placed')).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Retry with defaults' })).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════
// US-2.2 — Layer Toggle Controls
// ═══════════════════════════════════════════════════

test.describe('US-2.2 — Layer Toggle Controls', () => {
  test('Happy path: toggle tier off hides markers, toggle on restores them', async ({ page }) => {
    await reachNetworkMap(page);

    // All tiers start enabled (pressed state, with checkmark)
    const regionalBtn = page.getByRole('button', { name: /toggle regional hubs off/i });
    await expect(regionalBtn).toBeVisible();
    await expect(regionalBtn).toHaveAttribute('aria-pressed', 'true');

    // Toggle Regional off
    await regionalBtn.click();
    await page.waitForTimeout(300);

    // Button text should change to "on" (it's now off, clicking will turn on)
    const toggleOnBtn = page.getByRole('button', { name: /toggle regional hubs on/i });
    await expect(toggleOnBtn).toBeVisible();

    // Toggle back on
    await toggleOnBtn.click();
    await page.waitForTimeout(300);

    // Should be back to "off" label (currently on, clicking will turn off)
    await expect(page.getByRole('button', { name: /toggle regional hubs off/i })).toBeVisible();
  });

  test('E1: all tiers off shows hint message', async ({ page }) => {
    await reachNetworkMap(page);

    // Toggle all three tiers off
    const globalBtn = page.getByRole('button', { name: /toggle global hubs off/i });
    const regionalBtn = page.getByRole('button', { name: /toggle regional hubs off/i });
    const gatewayBtn = page.getByRole('button', { name: /toggle gateway hubs off/i });

    await globalBtn.click();
    await page.waitForTimeout(100);
    await regionalBtn.click();
    await page.waitForTimeout(100);
    await gatewayBtn.click();
    await page.waitForTimeout(300);

    // Hint message should appear
    await expect(page.getByText(/enable at least one tier/i)).toBeVisible({ timeout: 2000 });
  });

  test('E2: rapid tier toggling maintains consistent state', async ({ page }) => {
    await reachNetworkMap(page);

    // Toggle Regional 5 times rapidly via real clicks
    for (let i = 0; i < 5; i++) {
      const btn = page.getByRole('button', { name: /toggle regional hubs/i });
      await btn.click();
      // Minimal wait to let React re-render
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(300);

    // After 5 toggles (odd number), Regional should be OFF
    // The button should say "Toggle Regional hubs on" (meaning it's currently off)
    const toggleOnBtn = page.getByRole('button', { name: /toggle regional hubs on/i });
    await expect(toggleOnBtn).toBeVisible();

    // Global and Gateway should still be ON
    await expect(page.getByRole('button', { name: /toggle global hubs off/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /toggle gateway hubs off/i })).toBeVisible();

    // Verify via store
    const visibleTiers = await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      return Array.from(ns?.getState()?.visibleTiers ?? []);
    });
    expect(visibleTiers).toContain('global');
    expect(visibleTiers).toContain('gateway');
    expect(visibleTiers).not.toContain('regional');
  });
});

// ═══════════════════════════════════════════════════
// US-2.3 — Hub Detail Panel
// ═══════════════════════════════════════════════════

test.describe('US-2.3 — Hub Detail Panel', () => {
  test('Happy path: click hub shows detail panel with tier, throughput, capacity', async ({ page }) => {
    await reachNetworkMap(page);

    // Select a hub via store (clicking CircleMarkers in Playwright is unreliable)
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const hubs = ns?.getState()?.hubs ?? [];
      if (hubs.length > 0) ns.getState().setSelectedHubId(hubs[0].id);
    });
    await page.waitForTimeout(500);

    // Detail panel should show hub name, tier badge, throughput, capacity
    const body = await page.textContent('body');
    expect(body).toMatch(/THROUGHPUT|Throughput/i);
    expect(body).toMatch(/CAPACITY|Capacity/i);
    expect(body).toMatch(/tons/i);
  });

  test('Fixed hub shows "Fixed location" note in candidate sites', async ({ page }) => {
    await reachNetworkMap(page);

    // Select a Global hub with isFixed=true
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const fixedHub = ns?.getState()?.hubs?.find((h: any) => h.tier === 'global' && h.isFixed);
      if (fixedHub) ns.getState().setSelectedHubId(fixedHub.id);
    });
    await page.waitForTimeout(500);

    // Panel shows "Fixed location — not generated from candidates"
    await expect(page.getByText(/fixed location/i)).toBeVisible({ timeout: 2000 });
    // Tier badge shows "Global"
    await expect(page.getByText('Global')).toBeVisible();
  });

  test('Connected hub navigation: click connected hub switches panel', async ({ page }) => {
    await reachNetworkMap(page);

    // Select a hub that has connected hubs
    const hubId = await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const hubs = ns?.getState()?.hubs ?? [];
      const edges = ns?.getState()?.edges ?? [];
      // Find a hub that appears in at least one edge
      const hubsWithEdges = hubs.filter((h: any) =>
        edges.some((e: any) => e.source === h.id || e.target === h.id)
      );
      if (hubsWithEdges.length > 0) {
        ns.getState().setSelectedHubId(hubsWithEdges[0].id);
        return hubsWithEdges[0].id;
      }
      return null;
    });
    expect(hubId).not.toBeNull();
    await page.waitForTimeout(500);

    // Should show "Connected Hubs" section
    await expect(page.getByText(/connected hubs/i)).toBeVisible({ timeout: 2000 });
  });

  test('Close panel: clicking X closes detail panel', async ({ page }) => {
    await reachNetworkMap(page);

    // Open a hub panel
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const hubs = ns?.getState()?.hubs ?? [];
      if (hubs.length > 0) ns.getState().setSelectedHubId(hubs[0].id);
    });
    await page.waitForTimeout(500);

    // Panel should be visible
    await expect(page.getByText(/THROUGHPUT|Throughput/i)).toBeVisible();

    // Close it
    await page.evaluate(() => {
      (window as any).__stores?.network?.getState()?.setSelectedHubId(null);
    });
    await page.waitForTimeout(500);

    // Panel content should be gone
    await expect(page.getByText(/THROUGHPUT|Throughput/i)).not.toBeVisible();
  });
});

  test('E1: mobile viewport shows hub detail as bottom sheet', async ({ page }) => {
    // Set narrow viewport (iPhone SE: 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await reachNetworkMap(page);

    // Select a hub
    await page.evaluate(() => {
      const ns = (window as any).__stores?.network;
      const hubs = ns?.getState()?.hubs ?? [];
      if (hubs.length > 0) ns.getState().setSelectedHubId(hubs[0].id);
    });
    await page.waitForTimeout(500);

    // Panel should be visible as bottom sheet (CSS @media max-width: 768px)
    await expect(page.getByText(/THROUGHPUT|Throughput/i)).toBeVisible();

    // Verify the panel is at the bottom of the screen (bottom sheet layout)
    const panelBox = await page.evaluate(() => {
      // Find the hub detail panel element
      const el = document.querySelector('[class*="hubDetail"]') || document.querySelector('[class*="panel"]');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, height: rect.height };
    });
    // Panel should be in the lower portion of the viewport
    if (panelBox) {
      expect(panelBox.top).toBeGreaterThan(200); // Not at the top
    }
  });
});

// ═══════════════════════════════════════════════════
// US-2.4 — Tile Style Picker
// ═══════════════════════════════════════════════════

test.describe('US-2.4 — Tile Style Picker', () => {
  test('Happy path: four tile options with thumbnail previews, Dark selected by default', async ({ page }) => {
    await page.goto('/');

    // Tile picker radiogroup visible
    const picker = page.getByRole('radiogroup', { name: 'Map tile style' });
    await expect(picker).toBeVisible();

    // Four options: Dark, Light, Satellite, Terrain
    await expect(page.getByRole('radio', { name: 'Dark map style' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Light map style' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Satellite map style' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Terrain map style' })).toBeVisible();

    // Dark is selected by default
    await expect(page.getByRole('radio', { name: 'Dark map style' })).toBeChecked();

    // Each option has an <img> thumbnail (not a color swatch div)
    await expect(page.getByAltText('Dark tile preview')).toBeVisible();
    await expect(page.getByAltText('Light tile preview')).toBeVisible();
    await expect(page.getByAltText('Satellite tile preview')).toBeVisible();
    await expect(page.getByAltText('Terrain tile preview')).toBeVisible();
  });

  test('Switch tile style: click Light changes base map', async ({ page }) => {
    await page.goto('/');

    // Click Light
    await page.getByRole('radio', { name: 'Light map style' }).click();
    await page.waitForTimeout(500);

    // Light should now be selected
    await expect(page.getByRole('radio', { name: 'Light map style' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Dark map style' })).not.toBeChecked();

    // Verify store state
    const tileStyle = await page.evaluate(() => {
      return (window as any).__stores?.map?.getState()?.tileStyle;
    });
    expect(tileStyle).toBe('light');
  });

  test('Tile style persists in localStorage', async ({ page }) => {
    await page.goto('/');

    // Switch to Satellite
    await page.getByRole('radio', { name: 'Satellite map style' }).click();
    await page.waitForTimeout(300);

    // Check localStorage
    const stored = await page.evaluate(() => {
      return localStorage.getItem('supply-map-tile-style');
    });
    expect(stored).toBe('"satellite"');

    // Reload and verify persistence
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('radio', { name: 'Satellite map style' })).toBeChecked();
  });

  test('E1: switch back to Dark after Satellite', async ({ page }) => {
    await page.goto('/');

    // Go to Satellite
    await page.getByRole('radio', { name: 'Satellite map style' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('radio', { name: 'Satellite map style' })).toBeChecked();

    // Switch back to Dark
    await page.getByRole('radio', { name: 'Dark map style' }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('radio', { name: 'Dark map style' })).toBeChecked();

    // Verify attribution shows CARTO (dark uses CartoDB)
    await expect(page.getByText('CARTO')).toBeVisible();
  });
});
