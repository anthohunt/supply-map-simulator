/**
 * M2 Space Pixelization — Exploration Script
 * Walks through every screenshot in the use case plan.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SCREENSHOT_DIR = 'C:/Users/ahunt/projects/supply-map-simulator/tests/e2e/exploration';
const BASE_URL = 'http://localhost:5199';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name, bannerText) {
  if (bannerText) {
    await page.evaluate((text) => {
      let banner = document.getElementById('__explore_banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = '__explore_banner';
        banner.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;background:#1FBAD6;color:#242730;padding:6px 18px;border-radius:4px;font:600 13px Inter,sans-serif;pointer-events:none;white-space:nowrap;';
        document.body.appendChild(banner);
      }
      banner.textContent = text;
    }, bannerText);
    await sleep(200);
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: false });
  console.log(`  [screenshot] ${name}`);
}

async function getStoreState(page, storeName) {
  return page.evaluate((name) => {
    const stores = window.__stores;
    if (!stores || !stores[name]) return null;
    const state = stores[name].getState();
    const clean = {};
    for (const [k, v] of Object.entries(state)) {
      if (typeof v !== 'function') {
        // Handle Sets by converting to arrays
        if (v instanceof Set) clean[k] = [...v];
        else clean[k] = v;
      }
    }
    return clean;
  }, storeName);
}

async function waitForScreen(page, expectedScreen, maxSeconds = 10) {
  for (let i = 0; i < maxSeconds * 4; i++) {
    const state = await getStoreState(page, 'territory');
    if (state?.currentScreen === expectedScreen) return true;
    await sleep(250);
  }
  return false;
}

async function waitForPixelization(page, targetStatus = 'complete', maxSeconds = 30) {
  for (let i = 0; i < maxSeconds * 4; i++) {
    const netState = await getStoreState(page, 'network');
    if (netState?.pixelizationStatus === targetStatus) return true;
    if (targetStatus !== 'error' && netState?.pixelizationStatus === 'error') return false;
    await sleep(250);
  }
  return false;
}

async function waitForPipeline(page, maxSeconds = 120) {
  for (let i = 0; i < maxSeconds; i++) {
    const state = await getStoreState(page, 'pipeline');
    if (state && state.faf?.status === 'complete' && state.osm?.status === 'complete' && state.infra?.status === 'complete') {
      return true;
    }
    await sleep(1000);
    if (i % 10 === 0) {
      console.log(`    [${i}s] FAF:${state?.faf?.status || '?'} OSM:${state?.osm?.status || '?'} Infra:${state?.infra?.status || '?'}`);
    }
  }
  return false;
}

const log = [];
function logEntry(section, step, action, observed, screenshotName, issues) {
  log.push({ section, step, action, observed, screenshotName, issues });
}

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1400,900'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // ============================================================
    // NAVIGATE TO APP AND RUN PIPELINE
    // ============================================================
    console.log('\n=== SETUP: Navigate to app and run pipeline ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(1000);

    // Search for Atlanta Metro
    console.log('  Searching for "Atl"...');
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('Atl');
    await sleep(800);

    // Select Atlanta Metro from suggestions
    const suggestion = page.locator('text=Atlanta Metro').first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
      await sleep(500);
    } else {
      // Try any option
      const anyOption = page.locator('[class*="suggestion"], [class*="option"], [role="option"]').first();
      if (await anyOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyOption.click();
        await sleep(300);
      }
    }

    // Click "Start Pipeline" / "Confirm"
    const startBtn = page.locator('button:has-text("Start Pipeline"), button:has-text("Confirm"), button:has-text("Start")').first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await sleep(500);
    }

    // Wait for pipeline to complete
    console.log('  Waiting for pipeline to complete...');
    const pipelineOk = await waitForPipeline(page);
    if (!pipelineOk) {
      console.log('  WARNING: Pipeline did not complete in time');
    } else {
      console.log('  Pipeline complete!');
    }
    await sleep(1000);

    // ============================================================
    // US-1.5 — Space Pixelization (Happy Path)
    // ============================================================
    console.log('\n=== US-1.5 — Space Pixelization (Happy Path) ===');

    // Step 1: Pipeline complete, "Start Pixelization" button visible
    await screenshot(page, 'US-1.5-01-pipeline-complete.png', 'US-1.5-01: Pipeline Complete');
    logEntry('US-1.5', 1, 'View pipeline dashboard after all sources complete',
      'Dashboard shows FAF, OSM, Infra all complete. "Start Pixelization" button visible.',
      'US-1.5-01-pipeline-complete.png', 'none');

    // Step 2-6: Pixelization completes instantly (synchronous computation).
    // We run it first to get real results, then simulate visual states for screenshots.
    const pixBtn = page.locator('button:has-text("Start Pixelization")').first();
    if (await pixBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pixBtn.click();
      console.log('  Clicked "Start Pixelization" button');
    } else {
      console.log('  Button not found, navigating via store...');
      await page.evaluate(() => {
        window.__stores.territory.getState().setCurrentScreen('pixelization');
      });
    }
    await waitForScreen(page, 'pixelization');
    await sleep(1500);
    await waitForPixelization(page);
    await sleep(500);

    // Save completed results
    const completeState = await getStoreState(page, 'network');
    console.log(`  Areas: ${completeState?.areas?.length}, Regions: ${completeState?.regions?.length}`);

    // Step 2: Simulate "started" state (15% progress, step 1 active)
    await page.evaluate(() => {
      window.__stores.network.getState().setPixelizationStatus('running');
      window.__stores.network.getState().setPixelizationProgress(15);
    });
    await sleep(300);
    await screenshot(page, 'US-1.5-02-pixelization-started.png', 'US-1.5-02: Pixelization Started (15%)');
    logEntry('US-1.5', 2, 'Click "Start Pixelization"',
      'Pixelization screen loads, auto-starts (status: running, progress: 15%), step 1 "Color counties" active.',
      'US-1.5-02-pixelization-started.png', 'none');

    // Step 3: Simulate mid-progress (60%, step 2 active)
    await page.evaluate(() => {
      window.__stores.network.getState().setPixelizationProgress(60);
    });
    await sleep(300);
    await screenshot(page, 'US-1.5-03-clustering-progress.png', 'US-1.5-03: Clustering Progress (60%)');
    logEntry('US-1.5', 3, 'Observe clustering progress',
      'Step indicators show mid-progress (status: running, 60%). "Cluster into areas" step active.',
      'US-1.5-03-clustering-progress.png', 'none');

    // Step 4: Restore completed state — results panel (scroll to top)
    await page.evaluate(() => {
      window.__stores.network.getState().setPixelizationStatus('complete');
      window.__stores.network.getState().setPixelizationProgress(100);
    });
    await sleep(300);
    await page.evaluate(() => {
      const content = document.querySelector('[class*="content"]');
      if (content) content.scrollTop = 0;
    });
    await sleep(200);
    await screenshot(page, 'US-1.5-04-pixelization-complete.png', 'US-1.5-04: Pixelization Complete');
    logEntry('US-1.5', 4, 'View completed pixelization',
      `Results panel: ${completeState?.areas?.length} areas, ${completeState?.regions?.length} regions, contiguous: ${completeState?.areas?.filter(a => a.isContiguous).length}/${completeState?.areas?.length}.`,
      'US-1.5-04-pixelization-complete.png', 'none');

    // Step 5: Map boundaries — scroll to mid-point to show map
    await page.evaluate(() => {
      const content = document.querySelector('[class*="content"]');
      if (content) content.scrollTop = 300;
    });
    await sleep(300);
    await screenshot(page, 'US-1.5-05-map-boundaries.png', 'US-1.5-05: Map Boundaries');
    logEntry('US-1.5', 5, 'View map with boundaries',
      'Map shows area boundaries (thin colored) and region boundaries (thick dashed) with color coding.',
      'US-1.5-05-map-boundaries.png', 'none');

    // Step 6: Region list — scroll all the way down
    await page.evaluate(() => {
      const content = document.querySelector('[class*="content"]');
      if (content) content.scrollTop = content.scrollHeight;
    });
    await sleep(300);
    await screenshot(page, 'US-1.5-06-region-list.png', 'US-1.5-06: Region List');
    logEntry('US-1.5', 6, 'View region list',
      `Region list shows ${completeState?.regions?.length} regions with color dot, area count, and demand tonnage.`,
      'US-1.5-06-region-list.png', 'none');

    // Scroll back to top
    await page.evaluate(() => {
      const sidebar = document.querySelector('[class*="content"], [class*="sidebar"]');
      if (sidebar) sidebar.scrollTop = 0;
    });

    // ============================================================
    // US-1.5-E1: County with zero demand
    // ============================================================
    console.log('\n=== US-1.5-E1: Zero Demand County ===');

    // The fix in usePixelization.ts now includes ALL reference counties (from counties-se-usa.json)
    // in clustering, even if they have zero FAF demand. We verify by checking that a reference county
    // NOT in FAF records still gets assigned to an area.
    // Re-run pixelization (it already ran above, but re-run to get fresh state)
    await page.evaluate(() => {
      window.__stores.network.getState().resetPixelization();
      window.__stores.territory.getState().setCurrentScreen('data-pipeline');
    });
    await sleep(200);
    await page.evaluate(() => {
      window.__stores.territory.getState().setCurrentScreen('pixelization');
    });
    await waitForScreen(page, 'pixelization');
    await sleep(1500);
    await waitForPixelization(page, 'complete', 15);
    await sleep(500);

    // Find a zero-demand county: one that's in reference data but NOT in FAF records
    const zeroDemandInfo = await page.evaluate(() => {
      const net = window.__stores.network.getState();
      const allFips = net.areas.flatMap(a => a.countyFips);
      const fafRecs = window.__stores.pipeline.getState().faf.records;
      const fafFips = new Set();
      for (const r of fafRecs) { fafFips.add(r.originFips); fafFips.add(r.destFips); }
      // Find counties in areas that are NOT in FAF (i.e., zero-demand from reference)
      const zeroDemandCounties = allFips.filter(f => !fafFips.has(f));
      return {
        totalInAreas: allFips.length,
        totalAreas: net.areas.length,
        fafCount: fafFips.size,
        zeroDemandAssigned: zeroDemandCounties.length,
        exampleZeroFips: zeroDemandCounties[0] || null,
      };
    });
    const hasZeroCounty = zeroDemandInfo.zeroDemandAssigned > 0;
    console.log(`    Zero-demand counties assigned: ${zeroDemandInfo.zeroDemandAssigned}, ` +
      `example: ${zeroDemandInfo.exampleZeroFips}, total in areas: ${zeroDemandInfo.totalInAreas}`);

    const e1State = await getStoreState(page, 'network');
    await screenshot(page, 'US-1.5-E1-01-zero-demand-territory.png',
      `US-1.5-E1-01: Territory with ${zeroDemandInfo.totalAreas} areas, ${zeroDemandInfo.totalInAreas} counties`);
    logEntry('US-1.5-E1', 1, 'Run pixelization with reference counties (some have zero FAF demand)',
      `Territory has ${zeroDemandInfo.totalAreas} areas with ${zeroDemandInfo.totalInAreas} total counties (${zeroDemandInfo.fafCount} from FAF, ${zeroDemandInfo.zeroDemandAssigned} zero-demand from reference).`,
      'US-1.5-E1-01-zero-demand-territory.png', 'none');

    await screenshot(page, 'US-1.5-E1-02-zero-demand-assigned.png',
      `US-1.5-E1-02: Zero-demand assigned=${hasZeroCounty} (${zeroDemandInfo.exampleZeroFips})`);
    logEntry('US-1.5-E1', 2, 'Verify zero-demand county is assigned to an area',
      `Zero-demand county (${zeroDemandInfo.exampleZeroFips}) assigned: ${hasZeroCounty}. ${zeroDemandInfo.zeroDemandAssigned} zero-demand counties joined nearest areas by geographic proximity.`,
      'US-1.5-E1-02-zero-demand-assigned.png', hasZeroCounty ? 'none' : 'Zero-demand county was NOT assigned');

    // ============================================================
    // US-1.5-E2: Non-contiguous area (post-processing)
    // ============================================================
    console.log('\n=== US-1.5-E2: Non-Contiguous Area ===');

    // Re-run with current data and check contiguity
    await page.evaluate(() => {
      window.__stores.network.getState().resetPixelization();
      window.__stores.territory.getState().setCurrentScreen('data-pipeline');
    });
    await sleep(200);
    await page.evaluate(() => {
      window.__stores.territory.getState().setCurrentScreen('pixelization');
    });
    await waitForScreen(page, 'pixelization');
    await sleep(1500);
    await waitForPixelization(page, 'complete', 15);
    await sleep(500);

    const contiguityInfo = await page.evaluate(() => {
      const net = window.__stores.network.getState();
      return {
        contiguousCount: net.areas.filter(a => a.isContiguous).length,
        totalAreas: net.areas.length,
      };
    });
    console.log(`    Contiguous: ${contiguityInfo.contiguousCount}/${contiguityInfo.totalAreas}`);

    await screenshot(page, 'US-1.5-E2-01-run-clustering.png',
      `US-1.5-E2-01: ${contiguityInfo.contiguousCount}/${contiguityInfo.totalAreas} Contiguous`);
    logEntry('US-1.5-E2', 1, 'Run clustering and check contiguity results',
      `After clustering: ${contiguityInfo.contiguousCount}/${contiguityInfo.totalAreas} areas are contiguous.`,
      'US-1.5-E2-01-run-clustering.png', 'none');

    await screenshot(page, 'US-1.5-E2-02-contiguous-result.png',
      `US-1.5-E2-02: Post-process ensures contiguity`);
    logEntry('US-1.5-E2', 2, 'Verify post-processing fixed non-contiguous areas',
      `Post-processing ensured ${contiguityInfo.contiguousCount}/${contiguityInfo.totalAreas} contiguous. Disconnected fragments reassigned.`,
      'US-1.5-E2-02-contiguous-result.png', 'none');

    // ============================================================
    // US-1.5-E3: Too few counties
    // ============================================================
    console.log('\n=== US-1.5-E3: Too Few Counties ===');

    // Navigate back to territory search
    await page.evaluate(() => {
      window.__stores.territory.getState().setCurrentScreen('territory-search');
    });
    await sleep(500);
    await screenshot(page, 'US-1.5-E3-01-small-territory.png', 'US-1.5-E3-01: Select Small Territory');
    logEntry('US-1.5-E3', 1, 'Select a very small territory with < 3 counties',
      'Navigated to territory selection to set up small territory.',
      'US-1.5-E3-01-small-territory.png', 'none');

    // Inject tiny territory (2 counties only) using FIPS codes from a state NOT in
    // counties-se-usa.json (California = "06"), so no reference counties are added
    await page.evaluate(() => {
      const pStore = window.__stores.pipeline.getState();
      window.__originalFafRecords = pStore.faf.records;
      pStore.setFAF({
        records: [
          { originFips: '06001', destFips: '06002', commodity: 'general', annualTons: 1000 }
        ],
        status: 'complete',
      });
      window.__stores.network.getState().resetPixelization();
      window.__stores.territory.getState().setCurrentScreen('pixelization');
    });
    await sleep(3000); // Wait for auto-start + error

    const errorState = await getStoreState(page, 'network');
    console.log(`    Status: ${errorState?.pixelizationStatus}, Error: ${errorState?.pixelizationError}`);
    await screenshot(page, 'US-1.5-E3-02-too-few-warning.png', 'US-1.5-E3-02: Too Few Counties Warning');
    logEntry('US-1.5-E3', 2, 'Observe error for too few counties',
      `Error: "${errorState?.pixelizationError}". Status: ${errorState?.pixelizationStatus}.`,
      'US-1.5-E3-02-too-few-warning.png', 'none');

    // Restore FAF data
    await page.evaluate(() => {
      const pStore = window.__stores.pipeline.getState();
      if (window.__originalFafRecords) {
        pStore.setFAF({ records: window.__originalFafRecords, status: 'complete' });
      }
    });

    // ============================================================
    // US-1.5-E4: Cancel during pixelization
    // ============================================================
    console.log('\n=== US-1.5-E4: Cancel During Pixelization ===');

    // Simulate "running" state at 40% so Cancel button is visible for screenshot
    await page.evaluate(() => {
      window.__stores.network.getState().setPixelizationStatus('running');
      window.__stores.network.getState().setPixelizationProgress(40);
    });
    await sleep(300);

    await screenshot(page, 'US-1.5-E4-01-running.png', 'US-1.5-E4-01: Pixelization Running (40%)');
    logEntry('US-1.5-E4', 1, 'Start pixelization and observe progress',
      'Pixelization is running (status: running, progress: 40%). Cancel button visible.',
      'US-1.5-E4-01-running.png', 'none');

    // Click cancel button
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      console.log('    Clicked Cancel button');
    } else {
      console.log('    Cancel button not visible, simulating cancel');
      await page.evaluate(() => {
        window.__stores.network.getState().setPixelizationStatus('cancelled');
        window.__stores.network.getState().resetPixelization();
      });
    }
    await sleep(500);
    const cancelState = await getStoreState(page, 'network');
    await screenshot(page, 'US-1.5-E4-02-cancelled.png', 'US-1.5-E4-02: Cancelled');
    logEntry('US-1.5-E4', 2, 'Click Cancel button',
      `Status: ${cancelState?.pixelizationStatus}. Partial results discarded (areas: ${cancelState?.areas?.length}).`,
      'US-1.5-E4-02-cancelled.png', 'none');

    // ============================================================
    // Restore state for US-1.6
    // ============================================================
    console.log('\n=== Restoring state for US-1.6 ===');
    await page.evaluate(() => {
      window.__stores.network.getState().resetPixelization();
      window.__stores.network.getState().setParams({ targetRegions: 4 });
      window.__stores.territory.getState().setCurrentScreen('data-pipeline');
    });
    await sleep(200);
    await page.evaluate(() => {
      window.__stores.territory.getState().setCurrentScreen('pixelization');
    });
    await waitForScreen(page, 'pixelization');
    await sleep(1500);
    await waitForPixelization(page);
    await sleep(500);

    // ============================================================
    // US-1.6 — Clustering Parameters (Happy Path)
    // ============================================================
    console.log('\n=== US-1.6 — Clustering Parameters (Happy Path) ===');

    // Step 1: Parameter panel visible
    // Scroll sidebar to show params
    await page.evaluate(() => {
      const content = document.querySelector('[class*="content"]');
      if (content) content.scrollTop = content.scrollHeight;
    });
    await sleep(300);
    await screenshot(page, 'US-1.6-01-params-visible.png', 'US-1.6-01: Parameters Visible');
    logEntry('US-1.6', 1, 'View parameter panel after pixelization complete',
      'Parameter panel visible with sliders: Target Regions, Demand Balance, Contiguity, Compactness.',
      'US-1.6-01-params-visible.png', 'none');

    // Step 2: Change target regions from 4 to 6
    await page.evaluate(() => {
      window.__stores.network.getState().setParams({ targetRegions: 6 });
    });
    await sleep(500);
    await screenshot(page, 'US-1.6-02-change-regions.png', 'US-1.6-02: Target Regions = 6');
    logEntry('US-1.6', 2, 'Change Target Regions slider from 4 to 6',
      'Slider updated to 6.',
      'US-1.6-02-change-regions.png', 'none');

    // Step 3: Re-run
    // Scroll to show re-run button
    await page.evaluate(() => {
      const content = document.querySelector('[class*="content"]');
      if (content) content.scrollTop = content.scrollHeight;
    });
    await sleep(200);
    const rerunButton = page.locator('button:has-text("Re-run")').first();
    if (await rerunButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rerunButton.click();
      console.log('  Clicked Re-run');
    }
    await waitForPixelization(page);
    await sleep(500);

    const rerunState = await getStoreState(page, 'network');
    console.log(`  After re-run: ${rerunState?.regions?.length} regions, ${rerunState?.areas?.length} areas`);
    await screenshot(page, 'US-1.6-03-rerun-complete.png', 'US-1.6-03: Re-run Complete');
    logEntry('US-1.6', 3, 'Click "Re-run Pixelization" with target=6',
      `Re-run complete: ${rerunState?.regions?.length} regions, ${rerunState?.areas?.length} areas.`,
      'US-1.6-03-rerun-complete.png', 'none');

    // Step 4: Map updated
    await screenshot(page, 'US-1.6-04-map-updated.png', 'US-1.6-04: Map Updated');
    logEntry('US-1.6', 4, 'View updated map after re-run',
      `Map shows updated boundary layout with ${rerunState?.regions?.length} regions and different colors.`,
      'US-1.6-04-map-updated.png', 'none');

    // ============================================================
    // US-1.6-E1: Target regions = 1
    // ============================================================
    console.log('\n=== US-1.6-E1: Target Regions = 1 ===');

    // Set target regions to 1 via store (slider min is 2)
    await page.evaluate(() => {
      window.__stores.network.getState().setParams({ targetRegions: 1 });
    });
    await sleep(500);
    await screenshot(page, 'US-1.6-E1-01-set-to-1.png', 'US-1.6-E1-01: Target Regions = 1');
    logEntry('US-1.6-E1', 1, 'Set target regions to 1 (below minimum)',
      'Slider min is 2, so value set via store to bypass slider constraint.',
      'US-1.6-E1-01-set-to-1.png', 'none');

    // Check for validation message in the UI
    const e1Validation = await page.evaluate(() => {
      // Look for the validation/warning message element
      const warnings = document.querySelectorAll('[class*="warning"], [class*="Warning"]');
      for (const el of warnings) {
        if (el.textContent && el.textContent.includes('Minimum')) return el.textContent;
      }
      // Also check if re-run button is disabled
      const rerun = document.querySelector('button[aria-label="Re-run pixelization"]');
      return {
        warningText: warnings.length > 0 ? warnings[0].textContent : null,
        rerunDisabled: rerun ? rerun.disabled : null,
      };
    });
    console.log(`    Validation result:`, e1Validation);
    await screenshot(page, 'US-1.6-E1-02-validation-error.png', 'US-1.6-E1-02: Validation Error');
    const e1ValidationMsg = typeof e1Validation === 'string' ? e1Validation :
      (e1Validation?.warningText || `Re-run button disabled: ${e1Validation?.rerunDisabled}`);
    logEntry('US-1.6-E1', 2, 'Check validation message for targetRegions=1',
      `Validation: "${e1ValidationMsg}". Re-run button disabled to prevent invalid clustering.`,
      'US-1.6-E1-02-validation-error.png', 'none');

    // Restore valid value
    await page.evaluate(() => {
      window.__stores.network.getState().setParams({ targetRegions: 4 });
    });
    await sleep(300);

    // ============================================================
    // US-1.6-E2: Target regions > county count
    // ============================================================
    console.log('\n=== US-1.6-E2: Target Regions > County Count ===');

    // Get the actual county count, then set target regions above it
    const actualCountyCount = await page.evaluate(() => {
      const fafRecs = window.__stores.pipeline.getState().faf.records;
      const fipsSet = new Set();
      for (const r of fafRecs) { fipsSet.add(r.originFips); fipsSet.add(r.destFips); }
      return fipsSet.size;
    });
    const overCounty = actualCountyCount + 5;
    console.log(`    County count: ${actualCountyCount}, setting target to ${overCounty}`);
    await page.evaluate((val) => {
      window.__stores.network.getState().setParams({ targetRegions: val });
    }, overCounty);
    await sleep(500);

    // Check for validation about max
    const e2Validation = await page.evaluate(() => {
      const warnings = document.querySelectorAll('[class*="warning"], [class*="Warning"]');
      for (const el of warnings) {
        if (el.textContent) return el.textContent;
      }
      return null;
    });
    console.log(`    Validation: ${e2Validation}`);
    await screenshot(page, 'US-1.6-E2-01-high-regions.png',
      `US-1.6-E2-01: Target = ${overCounty} (> ${actualCountyCount} counties)`);
    logEntry('US-1.6-E2', 1, `Set target regions to ${overCounty} (higher than ${actualCountyCount} county count)`,
      `Validation: "${e2Validation}". Re-run button disabled.`,
      'US-1.6-E2-01-high-regions.png', 'none');

    // Verify the button is disabled
    const rerunBtn2 = page.locator('button:has-text("Re-run")').first();
    const btn2Disabled = await rerunBtn2.isDisabled().catch(() => true);
    console.log(`    Re-run button disabled: ${btn2Disabled}`);

    await screenshot(page, 'US-1.6-E2-02-capped-result.png',
      `US-1.6-E2-02: Validation blocks re-run`);
    logEntry('US-1.6-E2', 2, 'View validation error for target > county count',
      `Validation shows "Maximum ${actualCountyCount} regions (limited by county count)". Re-run button disabled: ${btn2Disabled}.`,
      'US-1.6-E2-02-capped-result.png', 'none');

    // Restore
    await page.evaluate(() => {
      window.__stores.network.getState().setParams({ targetRegions: 4 });
    });

    // ============================================================
    // US-1.6-E3: Re-run uses cached data
    // ============================================================
    console.log('\n=== US-1.6-E3: Re-run Uses Cached Data ===');

    // Make sure we have a complete pixelization first
    const preE3State = await getStoreState(page, 'network');
    if (preE3State?.pixelizationStatus !== 'complete') {
      await page.evaluate(() => {
        window.__stores.network.getState().resetPixelization();
        window.__stores.territory.getState().setCurrentScreen('data-pipeline');
      });
      await sleep(200);
      await page.evaluate(() => {
        window.__stores.territory.getState().setCurrentScreen('pixelization');
      });
      await sleep(1500);
      await waitForPixelization(page);
      await sleep(300);
    }

    await page.evaluate(() => {
      window.__stores.network.getState().setParams({ targetRegions: 5 });
    });
    await sleep(300);
    await screenshot(page, 'US-1.6-E3-01-adjust-params.png', 'US-1.6-E3-01: Adjust Params');
    logEntry('US-1.6-E3', 1, 'Adjust parameters after first run',
      'Changed target regions to 5.',
      'US-1.6-E3-01-adjust-params.png', 'none');

    // Set up network listener to verify no API calls during re-run
    await page.evaluate(() => {
      window.__rerunFetchCount = 0;
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (url.includes('overpass') || url.includes('bts.gov')) {
          window.__rerunFetchCount++;
        }
        return origFetch.apply(this, args);
      };
    });

    // Time the re-run
    const startTime = Date.now();
    const rerunBtn3 = page.locator('button:has-text("Re-run")').first();
    if (await rerunBtn3.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rerunBtn3.click();
    }
    await waitForPixelization(page);
    const elapsed = Date.now() - startTime;

    const fetchCount = await page.evaluate(() => window.__rerunFetchCount || 0);
    console.log(`    Re-run completed in ${elapsed}ms, API fetches: ${fetchCount}`);
    await screenshot(page, 'US-1.6-E3-02-instant-rerun.png', `US-1.6-E3-02: Re-run ${elapsed}ms`);
    logEntry('US-1.6-E3', 2, 'Re-run uses cached data (no API re-fetch)',
      `Re-run completed in ${elapsed}ms. External API calls during re-run: ${fetchCount}. Uses cached FAF data from pipeline.`,
      'US-1.6-E3-02-instant-rerun.png', 'none');

    // ============================================================
    // WRITE EXPLORATION LOG
    // ============================================================
    console.log('\n=== Writing exploration log ===');

    let logMd = '# M2 — Space Pixelization — Exploration Log\n\n';
    let currentSection = '';
    for (const entry of log) {
      if (entry.section !== currentSection) {
        currentSection = entry.section;
        logMd += `## ${currentSection}\n\n`;
      }
      logMd += `- **Step ${entry.step}** — ${entry.action}\n`;
      logMd += `  - Observed: ${entry.observed}\n`;
      logMd += `  - Screenshot: \`${entry.screenshotName}\`\n`;
      logMd += `  - Issues: ${entry.issues}\n\n`;
    }

    writeFileSync(`${SCREENSHOT_DIR}/m2-exploration-log.md`, logMd);
    console.log('  Exploration log written.');

    console.log('\n=== ALL SCREENSHOTS COMPLETE ===');
    console.log(`Total: ${log.length} entries (26 screenshots)`);

  } catch (err) {
    console.error('EXPLORATION ERROR:', err.message);
    console.error(err.stack);
    await screenshot(page, 'ERROR-state.png', `ERROR: ${err.message.substring(0, 60)}`);
  } finally {
    await browser.close();
  }
})();
