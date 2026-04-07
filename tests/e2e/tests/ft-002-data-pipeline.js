/**
 * FT-002: Data Pipeline Dashboard (US-1.2, US-1.3, US-1.4)
 * Verified via Playwright MCP exploration on 2026-04-07
 *
 * Precondition: Must select territory first (reuses FT-001 flow)
 *
 * Selectors confirmed via browser_snapshot:
 * - FAF panel: region[name="FAF freight data"]
 * - OSM panel: region[name="OSM road and rail data"]
 * - Infra panel: region[name="Infrastructure sites"]
 * - Status badges: text "Complete" within each panel
 * - Overall progress: text "100%"
 * - Change territory: role=button[name="Change territory"]
 */
module.exports = async function(page) {
  const results = [];
  await page.goto('http://localhost:5180', { waitUntil: 'networkidle' });

  // Setup: select territory and start pipeline
  const input = page.getByRole('combobox', { name: 'Search territories' });
  await input.waitFor({ timeout: 5000 });
  await input.pressSequentially('US');
  await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
  await page.getByRole('button', { name: 'Start data pipeline' }).click();
  await page.getByRole('heading', { name: 'Data Pipeline' }).waitFor({ timeout: 3000 });

  // AC-1 (US-1.2): FAF Freight Data panel shows complete with tonnage and counts
  try {
    const fafPanel = page.getByRole('region', { name: 'FAF freight data' });
    await fafPanel.waitFor({ timeout: 5000 });
    const fafText = await fafPanel.textContent();
    if (!fafText.includes('Complete')) throw new Error('FAF not complete');
    if (!fafText.includes('tons')) throw new Error('No tonnage shown');
    if (!fafText.includes('County Pairs')) throw new Error('No county pairs');
    if (!fafText.includes('Commodities')) throw new Error('No commodities');
    results.push({ id: 'AC-1', status: 'pass', detail: 'FAF panel complete with tonnage, pairs, commodities' });
  } catch (e) {
    results.push({ id: 'AC-1', status: 'fail', detail: e.message });
  }

  // AC-2 (US-1.3): OSM Road/Rail panel shows complete with infrastructure counts
  try {
    const osmPanel = page.getByRole('region', { name: 'OSM road and rail data' });
    await osmPanel.waitFor({ timeout: 5000 });
    const osmText = await osmPanel.textContent();
    if (!osmText.includes('Complete')) throw new Error('OSM not complete');
    if (!osmText.includes('Interstates')) throw new Error('No interstates count');
    if (!osmText.includes('Highways')) throw new Error('No highways count');
    if (!osmText.includes('Railroads')) throw new Error('No railroads count');
    if (!osmText.includes('Rail Yards')) throw new Error('No rail yards count');
    results.push({ id: 'AC-2', status: 'pass', detail: 'OSM panel complete with road/rail counts' });
  } catch (e) {
    results.push({ id: 'AC-2', status: 'fail', detail: e.message });
  }

  // AC-3 (US-1.4): Infrastructure Sites panel shows complete with site breakdown
  try {
    const infraPanel = page.getByRole('region', { name: 'Infrastructure sites' });
    await infraPanel.waitFor({ timeout: 5000 });
    const infraText = await infraPanel.textContent();
    if (!infraText.includes('Complete')) throw new Error('Infra not complete');
    if (!infraText.includes('Total Sites')) throw new Error('No total sites');
    if (!infraText.includes('Warehouses')) throw new Error('No warehouses');
    if (!infraText.includes('Terminals')) throw new Error('No terminals');
    if (!infraText.includes('Ports')) throw new Error('No ports');
    results.push({ id: 'AC-3', status: 'pass', detail: 'Infra panel complete with site breakdown' });
  } catch (e) {
    results.push({ id: 'AC-3', status: 'fail', detail: e.message });
  }

  // AC-4: Overall progress reaches 100%
  try {
    const progressText = await page.textContent('[ref=e48], .overall-progress-value, :text("100%")');
    results.push({ id: 'AC-4', status: 'pass', detail: 'Overall progress shows 100%' });
  } catch (e) {
    // Fallback: check if page contains 100%
    const bodyText = await page.textContent('body');
    if (bodyText.includes('100%')) {
      results.push({ id: 'AC-4', status: 'pass', detail: 'Overall progress 100% found in page' });
    } else {
      results.push({ id: 'AC-4', status: 'fail', detail: 'No 100% progress found' });
    }
  }

  // AC-5: Change Territory button returns to search screen
  try {
    await page.getByRole('button', { name: 'Change territory' }).click();
    const searchInput = page.getByRole('combobox', { name: 'Search territories' });
    await searchInput.waitFor({ timeout: 3000 });
    results.push({ id: 'AC-5', status: 'pass', detail: 'Change Territory returns to search screen' });
  } catch (e) {
    results.push({ id: 'AC-5', status: 'fail', detail: e.message });
  }

  return results;
};
