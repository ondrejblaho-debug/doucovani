// Smoke test of the deployed site (GitHub Pages) in WebKit with an iPhone viewport.
import { webkit, devices } from 'playwright';
const URL_ = process.env.LIVE; // e.g. LIVE=https://<user>.github.io/doucovani/ npm run e2e:live
if (!URL_) { console.error('set LIVE=<deployed URL>'); process.exit(2); }
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const errors = [];
const log = (...a) => console.log('•', ...a);
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL_);
// manifest + service worker
const man = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href); const j = await r.json(); return { href: l.href, status: r.status, start: new URL(j.start_url, l.href).href, scope: new URL(j.scope, l.href).href }; });
log('manifest:', JSON.stringify(man));
if (man.status !== 200 || !man.scope.endsWith('/doucovani/')) errors.push('manifest scope wrong');
const sw = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => ({ scope: r.scope, active: !!r.active })));
log('service worker:', JSON.stringify(sw));
if (!sw.scope.endsWith('/doucovani/') || !sw.active) errors.push('service worker not active under /doucovani/');
// setup flow
await page.locator('.setup').waitFor();
await page.screenshot({ path: SHOTS + 'live-01-setup.png' });
await page.getByPlaceholder('např. Ája').fill('Testík');
await page.locator('.emojis .chip').nth(3).click();
await page.getByText('6leté gymnázium (7. třída)').click();
const en = await page.locator('.setup .toggle input').isChecked();
log('English default ON:', en); if (!en) errors.push('english default off');
await page.getByRole('button', { name: 'Vytvořit profil' }).click();
await page.getByText('Ahoj, Testík!').waitFor();
// a lesson on a plan day (Tue 13. 10. 2026: Czech + English)
await page.evaluate(() => localStorage.setItem('doucovani:today', '2026-10-13'));
await page.reload();
await page.locator('.pbtn', { hasText: 'Testík' }).click();
await page.getByText('Dnešní lekce').waitFor();
await page.screenshot({ path: SHOTS + 'live-02-dnes.png' });
await page.getByRole('button', { name: /Začít lekci/ }).click();
while (await page.locator('.explain-card').count()) await page.locator('.explain-card button.primary').click();
let n = 0;
while (await page.locator('.task').count() && n < 80) {
  const t = page.locator('.task'); const k = await t.getAttribute('data-kind');
  if (['mc', 'gap', 'yn'].includes(k)) await t.locator('button.opt').first().click();
  else if (k === 'yng') { const rows = t.locator('.yngrow'); for (let i = 0; i < await rows.count(); i++) await rows.nth(i).locator('button.chip').first().click(); await t.locator('button.primary').click(); }
  else if (k === 'num' || k === 'text') { await t.locator('input.answer').fill('1'); await t.locator('button.primary', { hasText: 'Zkontrolovat' }).click(); }
  else if (k === 'match') { const s = t.locator('select'); for (let i = 0; i < await s.count(); i++) await s.nth(i).selectOption({ index: 1 }); await t.locator('button.primary').click(); }
  else await t.locator('button.primary').click();
  await page.locator('.feedback').waitFor();
  if (n === 2) await page.screenshot({ path: SHOTS + 'live-03-uloha.png' });
  await page.getByRole('button', { name: 'Další', exact: true }).click(); n++;
}
await page.getByText('Skvělá práce!').waitFor();
log('lesson finished on live site:', n, 'tasks');
await page.getByRole('button', { name: 'Zpět na Dnes' }).click();
// offline reload
await ctx.setOffline(true);
await page.reload();
await page.locator('.pbtn', { hasText: 'Testík' }).click();
await page.getByText('Hotovo!', { exact: true }).waitFor();
log('offline reload: OK (app + progress available without network)');
await page.screenshot({ path: SHOTS + 'live-04-offline.png' });
await b.close();
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('✓ live test passed');
