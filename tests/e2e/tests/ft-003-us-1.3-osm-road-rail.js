/**
 * FT-003: OSM Road/Rail Infrastructure Loading (US-1.3)
 * Verified via Playwright MCP exploration on 2026-04-07
 *
 * Real selectors from browser_snapshot:
 * - OSM panel: role=region[name="OSM road and rail data"]
 * - Separate Road/Rail progress bars
 * - Metrics: Interstates (12), Highways (47), Railroads (23), Rail Yards (8), Road km (14,832), Rail km (6,241)
 */
module.exports = async function(page) {
  const results = [];
  const BASE = 'http://localhost:5180';

  // Setup: navigate to data pipeline
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const input = page.getByRole('combobox', { name: 'Search territories' });
  await input.waitFor({ timeout: 5000 });
  await input.pressSequentially('US');
  await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
  await page.getByRole('button', { name: 'Start data pipeline' }).click();
  await page.getByRole('heading', { name: 'Data Pipeline' }).waitFor({ timeout: 3000 });

  // === MAIN STORY ACs ===

  // AC-1: OSM panel exists and shows complete
  try {
    const osmPanel = page.getByRole('region', { name: 'OSM road and rail data' });
    await osmPanel.waitFor({ timeout: 5000 });
    const text = await osmPanel.textContent();
    if (!text.includes('Complete')) throw new Error('OSM panel not Complete');
    results.push({ id: 'AC-1', status: 'pass', detail: 'OSM panel shows Complete' });
  } catch (e) {
    results.push({ id: 'AC-1', status: 'fail', detail: e.message });
  }

  // AC-2: Separate Road and Rail progress indicators
  try {
    const osmPanel = page.getByRole('region', { name: 'OSM road and rail data' });
    const text = await osmPanel.textContent();
    if (!text.includes('Road')) throw new Error('No Road progress');
    if (!text.includes('Rail')) throw new Error('No Rail progress');
    results.push({ id: 'AC-2', status: 'pass', detail: 'Road and Rail progress shown separately' });
  } catch (e) {
    results.push({ id: 'AC-2', status: 'fail', detail: e.message });
  }

  // AC-3: Infrastructure counts (interstates, highways, railroads, yards)
  try {
    const osmPanel = page.getByRole('region', { name: 'OSM road and rail data' });
    const text = await osmPanel.textContent();
    const checks = ['Interstates', 'Highways', 'Railroads', 'Rail Yards'];
    const missing = checks.filter(c => !text.includes(c));
    if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
    results.push({ id: 'AC-3', status: 'pass', detail: 'All 4 infrastructure counts shown' });
  } catch (e) {
    results.push({ id: 'AC-3', status: 'fail', detail: e.message });
  }

  // AC-4: Distance totals (road km, rail km)
  try {
    const osmPanel = page.getByRole('region', { name: 'OSM road and rail data' });
    const text = await osmPanel.textContent();
    if (!text.includes('Road km')) throw new Error('No Road km');
    if (!text.includes('Rail km')) throw new Error('No Rail km');
    results.push({ id: 'AC-4', status: 'pass', detail: 'Road km and Rail km totals shown' });
  } catch (e) {
    results.push({ id: 'AC-4', status: 'fail', detail: e.message });
  }

  // === EDGE CASES ===
  results.push({ id: 'E1-rate-limit', status: 'skip', detail: 'Simulated service — no Overpass API rate limiting. Implement with real API.' });
  results.push({ id: 'E2-large-territory', status: 'skip', detail: 'Simulated service — no chunking needed. Implement with real API for large territories.' });
  results.push({ id: 'E3-malformed-geometry', status: 'skip', detail: 'Simulated service — no real geometry parsing. Implement with real OSM data.' });

  return results;
};
