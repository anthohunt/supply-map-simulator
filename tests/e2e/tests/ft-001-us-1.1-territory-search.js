/**
 * FT-001: Territory Search & Selection (US-1.1)
 * Verified via Playwright MCP exploration on 2026-04-07
 *
 * Real selectors from browser_snapshot:
 * - combobox: role=combobox[name="Search territories"]
 * - listbox: appears after 2+ chars (role=listbox)
 * - options: role=option[name="US Southeast Megaregion"] etc.
 * - no results: generic containing "No territories found"
 * - start button: role=button[name="Start data pipeline"]
 */
module.exports = async function(page) {
  const results = [];
  const BASE = 'http://localhost:5180';

  // === MAIN STORY ACs ===

  // AC-1: Search input visible and focusable
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.waitFor({ timeout: 5000 });
    await input.click();
    results.push({ id: 'AC-1', status: 'pass', detail: 'Search input visible and focusable' });
  } catch (e) {
    results.push({ id: 'AC-1', status: 'fail', detail: e.message });
  }

  // AC-2: Typing 2+ chars shows autocomplete with matching territories
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.pressSequentially('US');
    await page.getByRole('listbox').waitFor({ timeout: 3000 });
    const options = await page.getByRole('option').count();
    if (options < 1) throw new Error('No autocomplete options shown');
    const seOption = page.getByRole('option', { name: 'US Southeast Megaregion' });
    await seOption.waitFor({ timeout: 2000 });
    results.push({ id: 'AC-2', status: 'pass', detail: `${options} options shown for "US"` });
  } catch (e) {
    results.push({ id: 'AC-2', status: 'fail', detail: e.message });
  }

  // AC-3: Selecting territory shows it + reveals Start Pipeline button
  try {
    await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
    const startBtn = page.getByRole('button', { name: 'Start data pipeline' });
    await startBtn.waitFor({ timeout: 2000 });
    results.push({ id: 'AC-3', status: 'pass', detail: 'Territory selected, Start Pipeline visible' });
  } catch (e) {
    results.push({ id: 'AC-3', status: 'fail', detail: e.message });
  }

  // AC-4: Start Pipeline navigates to Data Pipeline screen
  try {
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    await page.getByRole('heading', { name: 'Data Pipeline' }).waitFor({ timeout: 3000 });
    results.push({ id: 'AC-4', status: 'pass', detail: 'Navigated to Data Pipeline' });
  } catch (e) {
    results.push({ id: 'AC-4', status: 'fail', detail: e.message });
  }

  // AC-5: Change Territory returns to search
  try {
    await page.getByRole('button', { name: 'Change territory' }).click();
    await page.getByRole('combobox', { name: 'Search territories' }).waitFor({ timeout: 3000 });
    results.push({ id: 'AC-5', status: 'pass', detail: 'Change Territory returns to search' });
  } catch (e) {
    results.push({ id: 'AC-5', status: 'fail', detail: e.message });
  }

  // === EDGE CASES ===

  // E1: No results shows message
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.pressSequentially('zzzzz');
    await page.waitForTimeout(500);
    const noResults = await page.textContent('body');
    if (!noResults.includes('No territories found')) throw new Error('No "No territories found" message');
    results.push({ id: 'E1', status: 'pass', detail: '"No territories found" message shown for nonsense query' });
  } catch (e) {
    results.push({ id: 'E1', status: 'fail', detail: e.message });
  }

  // E2: Typing 1 char does NOT trigger autocomplete
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.pressSequentially('U');
    await page.waitForTimeout(500);
    const listbox = await page.getByRole('listbox').count();
    if (listbox > 0) throw new Error('Autocomplete triggered with only 1 char');
    results.push({ id: 'E2', status: 'pass', detail: 'No autocomplete with 1 character' });
  } catch (e) {
    results.push({ id: 'E2', status: 'fail', detail: e.message });
  }

  return results;
};
