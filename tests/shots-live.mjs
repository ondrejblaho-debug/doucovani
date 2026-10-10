// Screenshots of the deployed site (iPhone viewport, WebKit), light + dark.  LIVE=<url> node tests/shots-live.mjs
import { webkit, devices } from 'playwright';
const URL_ = process.env.LIVE; if (!URL_) { console.error('set LIVE'); process.exit(2); }
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const b = await webkit.launch();
async function run(scheme) {
  const sfx = scheme === 'dark' ? '-dark' : '';
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'cs-CZ', timezoneId: 'Europe/Prague', colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(URL_);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(() => localStorage.setItem('doucovani:today', '2026-10-13'));
  await page.reload();
  await page.locator('.setup').waitFor();
  await page.getByPlaceholder('např. Ája').fill('Klára');
  await page.locator('.emojis .chip').nth(2).click();
  await page.getByText('6leté gymnázium (7. třída)').click();
  if (!sfx) await page.screenshot({ path: SHOTS + 'redesign-01-setup.png' });
  await page.getByRole('button', { name: 'Vytvořit profil' }).click();
  await page.getByText('Dnešní lekce').waitFor();
  await page.screenshot({ path: SHOTS + `redesign-02-dnes${sfx}.png` });
  await page.getByRole('button', { name: /Začít lekci/ }).click();
  if (!sfx) await page.screenshot({ path: SHOTS + 'redesign-03-vysvetleni.png' });
  while (await page.locator('.explain-card').count()) await page.locator('.explain-card button.primary').click();
  let n = 0, shot = false;
  while (await page.locator('.task').count() && n < 80) {
    const t = page.locator('.task'); const k = await t.getAttribute('data-kind');
    if (['mc', 'gap', 'yn'].includes(k)) await t.locator('button.opt').nth(n % 2).click();
    else if (k === 'yng') { const rows = t.locator('.yngrow'); for (let i = 0; i < await rows.count(); i++) await rows.nth(i).locator('button.chip').first().click(); await t.locator('button.primary').click(); }
    else if (k === 'num' || k === 'text') { await t.locator('input.answer').fill('1'); await t.locator('button.primary', { hasText: 'Zkontrolovat' }).click(); }
    else if (k === 'match') { const s = t.locator('select'); for (let i = 0; i < await s.count(); i++) await s.nth(i).selectOption({ index: 1 }); await t.locator('button.primary').click(); }
    else await t.locator('button.primary').click();
    await page.locator('.feedback').waitFor();
    if (!shot && k === 'mc' && n >= 1) { await page.locator('.feedback').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + `redesign-04-uloha-zpetna-vazba${sfx}.png` }); shot = true; }
    await page.getByRole('button', { name: 'Další', exact: true }).click(); n++;
  }
  await page.getByText('Skvělá práce!').waitFor();
  if (!sfx) await page.screenshot({ path: SHOTS + 'redesign-05-hotovo.png' });
  await page.getByRole('button', { name: 'Zpět na Dnes' }).click();
  await page.locator('.tabs button', { hasText: 'Kalendář' }).click();
  await page.locator('.cal').waitFor();
  await page.screenshot({ path: SHOTS + `redesign-06-kalendar${sfx}.png` });
  if (!sfx) { await page.getByRole('button', { name: 'Další měsíc' }).click(); await page.screenshot({ path: SHOTS + 'redesign-07-kalendar-listopad.png' }); }
  await page.locator('.tabs button', { hasText: 'Test' }).click();
  await page.getByText('Testy nanečisto').waitFor();
  await page.screenshot({ path: SHOTS + `redesign-08-test${sfx}.png` });
  await ctx.close();
}
await run('light'); await run('dark');
await b.close(); console.log('✓ shots done');
