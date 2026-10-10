// Layout guard: nothing may ever sit under the tab bar / bottom action bar (WebKit, iPhone 13 + iPhone SE).
import { webkit, devices } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173/doucovani/';
const errors = []; let checks = 0;
const log = (...a) => console.log('•', ...a);

async function check(page, label, { focus = false, sticky = false } = {}) {
  // let Preact commit the navigation (renders are batched) before measuring
  await page.waitForFunction((f) => document.documentElement.classList.contains('focus') === f, focus, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(150);
  const r = await page.evaluate(({ sticky }) => {
    const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
    const tabs = document.querySelector('.tabs');
    const ab = [...document.querySelectorAll('.actionbar')].pop();
    const focus = document.documentElement.classList.contains('focus');
    const bar = shown(tabs) ? tabs : ab;
    const H = innerHeight;
    const out = { focus, tabsShown: shown(tabs), hasAB: !!ab, issues: [] };
    const barTop = () => (bar ? bar.getBoundingClientRect().top : H);
    if (sticky) { // at the top of the page the sticky CTA must be fully above the tab bar
      window.scrollTo(0, 0);
      const b = document.querySelector('.sticky-cta');
      if (!b) out.issues.push('no sticky CTA'); else if (b.getBoundingClientRect().bottom > barTop() + 0.5) out.issues.push(`sticky CTA under bar (${b.getBoundingClientRect().bottom} > ${barTop()})`);
    }
    if (ab) { const b = ab.querySelector('button'); const rr = b.getBoundingClientRect(); if (rr.bottom > H + 0.5 || rr.top < 0) out.issues.push('action button outside viewport'); }
    window.scrollTo(0, document.documentElement.scrollHeight);
    const top = barTop();
    let maxB = 0, who = '';
    for (const el of document.querySelectorAll('main *')) {
      if (el.closest('.actionbar, .tabs') || !el.getClientRects().length) continue;
      const pos = getComputedStyle(el).position; if (pos === 'fixed' || pos === 'sticky') continue;
      if (el.closest('details:not([open])') && el.tagName !== 'SUMMARY' && !el.matches('details')) continue;
      const b = el.getBoundingClientRect().bottom; if (b > maxB) { maxB = b; who = el.tagName + '.' + el.className; }
    }
    if (maxB > top + 0.5) out.issues.push(`content bottom ${Math.round(maxB)} > bar top ${Math.round(top)} (${who})`);
    window.scrollTo(0, 0);
    return out;
  }, { sticky });
  checks++;
  if (focus && (r.tabsShown || !r.focus)) r.issues.push('tab bar visible during focus mode');
  if (focus && !(await page.locator('.topbar button.icon').count())) r.issues.push('no close/back control at top');
  if (!focus && !r.tabsShown) r.issues.push('tab bar missing');
  for (const i of r.issues) errors.push(`${label}: ${i}`);
  return r;
}

const b = await webkit.launch();
for (const dev of ['iPhone 13', 'iPhone SE']) {
  const ctx = await b.newContext({ ...devices[dev], locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  await page.evaluate(() => localStorage.setItem('doucovani:today', '2026-10-13'));
  await page.reload();
  await page.getByPlaceholder('např. Ája').fill('Klára');
  await page.getByText('6leté gymnázium (7. třída)').click();
  await page.getByRole('button', { name: 'Vytvořit profil' }).click();
  await page.getByText('Dnešní lekce').waitFor();
  await check(page, `${dev} Dnes`, { sticky: true });
  await page.getByRole('button', { name: /Začít lekci/ }).click();
  await page.locator('.explain-card').waitFor();
  await check(page, `${dev} lesson card`, { focus: true });
  while (await page.locator('.explain-card').count()) await page.locator('.explain-card .actionbar button.primary').click();
  let n = 0, kinds = new Set();
  while (await page.locator('.task').count() && n < 80) {
    const t = page.locator('.task'); const k = await t.getAttribute('data-kind');
    if (['mc', 'gap', 'yn'].includes(k)) await t.locator('button.opt').first().click();
    else {
      if (!kinds.has('pre-' + k)) { kinds.add('pre-' + k); await check(page, `${dev} task ${k} (before check)`, { focus: true }); }
      if (k === 'yng') { const rows = t.locator('.yngrow'); for (let i = 0; i < await rows.count(); i++) await rows.nth(i).locator('button.chip').first().click(); }
      else if (k === 'num' || k === 'text') await t.locator('input.answer').fill('1');
      else if (k === 'match') { const s = t.locator('select'); for (let i = 0; i < await s.count(); i++) await s.nth(i).selectOption({ index: 1 }); }
      await t.locator('.actionbar button.primary').click();
    }
    await page.locator('.feedback').waitFor();
    if (!kinds.has(k)) { kinds.add(k); await check(page, `${dev} task ${k} + feedback`, { focus: true }); }
    await page.getByRole('button', { name: 'Další', exact: true }).click(); n++;
  }
  await page.getByText('Skvělá práce!').waitFor();
  await check(page, `${dev} lesson finish`, { focus: true });
  await page.getByRole('button', { name: 'Zpět na Dnes' }).click();
  await check(page, `${dev} Dnes (done)`);
  await page.locator('.tabs button', { hasText: 'Kalendář' }).click(); await page.locator('.cal').waitFor();
  await check(page, `${dev} Kalendář`);
  await page.locator('.tabs button', { hasText: 'Test' }).click(); await page.getByText('Testy nanečisto').waitFor();
  await check(page, `${dev} Test list`);
  await page.locator('.mockcard button.primary').first().click();
  await page.getByText('Hotovo – vyhodnotit').waitFor();
  await check(page, `${dev} mock entry`, { focus: true });
  await page.getByText('Hotovo – vyhodnotit').click();
  await page.getByText('Uložit výsledek').waitFor();
  await check(page, `${dev} mock scoring`, { focus: true });
  await page.getByRole('button', { name: 'Zpět' }).first().click();
  await page.getByText('Testy nanečisto').waitFor();
  await page.locator('.tabs').waitFor({ state: 'visible', timeout: 3000 }).catch(() => errors.push(`${dev}: tab bar not restored after leaving mock`));
  await check(page, `${dev} back from mock (tab bar restored)`);
  await page.locator('.tabs button', { hasText: 'Rodič' }).click();
  await check(page, `${dev} Rodič PIN`);
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByText('Záloha').first().waitFor();
  await check(page, `${dev} Rodič`);
  log(dev, 'kinds checked:', [...kinds].join(','));
  await ctx.close();
}
await b.close();
log('layout checks:', checks);
if (errors.length) { console.error('✗ layout errors:\n' + errors.join('\n')); process.exit(1); }
console.log('✓ layout passed');
