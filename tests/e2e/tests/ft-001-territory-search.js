/**
 * FT-001: Territory Search & Selection (US-1.1)
 * Verified via Playwright MCP exploration on 2026-04-07
 *
 * Selectors confirmed via browser_snapshot — these are REAL:
 * - combobox: role=combobox[name="Search territories"]
 * - listbox: role=listbox (appears after 2+ chars typed)
 * - options: role=option[name="US Southeast Megaregion"] etc.
 * - start button: role=button[name="Start data pipeline"]
 */
module.exports = async function(page) {
  const results = [];
  await page.goto('http://localhost:5180', { waitUntil: 'networkidle' });

  // AC-1: Search input is visible and focusable
  try {
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.waitFor({ timeout: 5000 });
    await input.click();
    results.push({ id: 'AC-1', status: 'pass', detail: 'Search input visible and focusable' });
  } catch (e) {
    results.push({ id: 'AC-1', status: 'fail', detail: e.message });
  }

  // AC-2: Typing "US" shows autocomplete with matching territories
  try {
    const input = page.getByRole('combobox', { name: 'Search territories' });
    await input.pressSequentially('US');
    await page.getByRole('listbox').waitFor({ timeout: 3000 });
    const options = await page.getByRole('option').count();
    if (options < 1) throw new Error('No autocomplete options shown');
    const seOption = page.getByRole('option', { name: 'US Southeast Megaregion' });
    await seOption.waitFor({ timeout: 2000 });
    results.push({ id: 'AC-2', status: 'pass', detail: `${options} options shown, SE Megaregion present` });
  } catch (e) {
    results.push({ id: 'AC-2', status: 'fail', detail: e.message });
  }

  // AC-3: Selecting a territory shows it and reveals Start Pipeline button
  try {
    await page.getByRole('option', { name: 'US Southeast Megaregion' }).click();
    const startBtn = page.getByRole('button', { name: 'Start data pipeline' });
    await startBtn.waitFor({ timeout: 2000 });
    results.push({ id: 'AC-3', status: 'pass', detail: 'Territory selected, Start Pipeline button visible' });
  } catch (e) {
    results.push({ id: 'AC-3', status: 'fail', detail: e.message });
  }

  // AC-4: Clicking Start Pipeline navigates to Data Pipeline screen
  try {
    await page.getByRole('button', { name: 'Start data pipeline' }).click();
    const heading = page.getByRole('heading', { name: 'Data Pipeline' });
    await heading.waitFor({ timeout: 3000 });
    results.push({ id: 'AC-4', status: 'pass', detail: 'Navigated to Data Pipeline screen' });
  } catch (e) {
    results.push({ id: 'AC-4', status: 'fail', detail: e.message });
  }

  return results;
};
