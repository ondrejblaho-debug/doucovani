// E2E: active-time tracking, lesson resume, parent dashboard, weekly reminder, share-link roundtrip.
import { webkit, devices } from 'playwright';
import { demoPair, demoProfile, seedDemo, DEMO_TODAY } from './demo-seed.mjs';
const BASE = process.env.BASE || 'http://localhost:4173/doucovani/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const errors = [];
const log = (...a) => console.log('•', ...a);
const expect = (c, m) => { if (!c) errors.push(m); };
const dev = { ...devices['iPhone 13'], locale: 'cs-CZ', timezoneId: 'Europe/Prague' };
const b = await webkit.launch();

async function answer(page) {
  const t = page.locator('.task'); await t.waitFor();
  const k = await t.getAttribute('data-kind');
  if (['mc', 'gap', 'yn'].includes(k)) await t.locator('button.opt').first().click();
  else {
    if (k === 'yng') { const rows = t.locator('.yngrow'); for (let i = 0; i < await rows.count(); i++) await rows.nth(i).locator('button.chip').first().click(); }
    else if (k === 'num' || k === 'text') await t.locator('input.answer').fill('1');
    else if (k === 'match') { const s = t.locator('select'); for (let i = 0; i < await s.count(); i++) await s.nth(i).selectOption({ index: 1 }); }
    await t.locator('.actionbar button.primary').click();
  }
  await page.locator('.feedback').waitFor();
  await page.getByRole('button', { name: 'Další', exact: true }).click();
}
const lesson = (page) => page.evaluate(() => { const g = JSON.parse(localStorage.getItem('doucovani:v1:global')); const p = JSON.parse(localStorage.getItem('doucovani:v1:profile:' + g.profiles[0].id)); return Object.values(p.lessons)[0]; });
const setVis = (page, v) => page.evaluate((v) => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); Object.defineProperty(document, 'hidden', { value: v === 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);

// ───────────── 1+2: time tracking and resume ─────────────
{
  const ctx = await b.newContext(dev);
  await ctx.clock.install({ time: new Date('2026-10-13T16:00:00+02:00') });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByPlaceholder('např. Ája').fill('Ema');
  await page.getByText('8leté gymnázium (5. třída)').click();
  await page.getByRole('button', { name: 'Vytvořit profil' }).click();
  await page.getByRole('button', { name: /Začít lekci/ }).click();
  // explanation card 1 (30 s), then close the app in the middle of card 2 → resume must continue at card 2
  await page.locator('.explain-card').waitFor();
  const nCards = await page.evaluate(() => document.querySelector('.topbar small')?.textContent);
  await ctx.clock.fastForward('00:30');
  await page.locator('.explain-card .actionbar button.primary').click();
  let L = await lesson(page);
  expect(L.cardsDone === 1 && Math.abs(L.cardSec - 30) <= 3, `card time ${L.cardSec} (expected ~30)`);
  log('card 1 active time:', L.cardSec, 's ·', nCards);
  await page.goto('about:blank');
  await page.goto(BASE);
  await page.locator('.pbtn', { hasText: 'Ema' }).click();
  await page.getByRole('button', { name: /Pokračovat|Začít lekci/ }).click();
  const lbl = await page.locator('.topbar small').textContent();
  expect(/Vysvětlení 2\//.test(lbl), `card resume label: ${lbl}`);
  log('resume after reopen (cards):', lbl);
  while (await page.locator('.explain-card').count()) await page.locator('.explain-card .actionbar button.primary').click();

  // task 1: 10 min without any interaction → capped at 2 min of idle
  await page.locator('.task').waitFor();
  await ctx.clock.fastForward('10:00');
  await answer(page);
  L = await lesson(page);
  const s1 = L.answers[0].sec;
  expect(s1 >= 118 && s1 <= 126, `idle cap: task sec ${s1} (expected ~120)`);
  log('task 1 (10 min idle) →', s1, 's');

  // task 2: 15 s active, app backgrounded for 5 min, then 20 s active
  await page.locator('.task').waitFor();
  await ctx.clock.fastForward('00:15');
  await page.mouse.click(5, 300);
  await setVis(page, 'hidden');
  await ctx.clock.fastForward('05:00');
  await setVis(page, 'visible');
  await ctx.clock.fastForward('00:20');
  await answer(page);
  L = await lesson(page);
  const s2 = L.answers[1].sec;
  expect(s2 >= 33 && s2 <= 40, `background pause: task sec ${s2} (expected ~35)`);
  log('task 2 (15 s + 5 min in background + 20 s) →', s2, 's');

  // task 3: 40 s, then the app is closed; reopen → same task, time carried over
  await answer(page);
  await page.locator('.task').waitFor();
  const idxBefore = (await lesson(page)).idx;
  await ctx.clock.fastForward('00:40');
  await page.mouse.click(5, 300);
  await page.goto('about:blank'); // pagehide → pending time saved
  L = await lesson(page.context().pages()[0] === page ? await (async () => { await page.goto(BASE); return page; })() : page);
  expect(L.pendingSec >= 38 && L.pendingSec <= 44, `pending time saved on close: ${L.pendingSec}`);
  await page.locator('.pbtn', { hasText: 'Ema' }).click();
  const cont = await page.getByRole('button', { name: /Pokračovat/ }).textContent();
  expect(cont.includes(`(${idxBefore}/`), `resume button: ${cont}`);
  await page.getByRole('button', { name: /Pokračovat/ }).click();
  const tl = await page.locator('.topbar small').textContent();
  expect(tl.startsWith(`${idxBefore + 1} /`), `resumed at task ${tl}`);
  await page.waitForFunction(() => window.__doucovaniActivity?.running); // effects run after paint
  await ctx.clock.fastForward('00:05');
  await answer(page);
  L = await lesson(page);
  const s4 = L.answers[idxBefore].sec;
  expect(s4 >= 43 && s4 <= 50 && !L.pendingSec, `carried-over time ${s4}`);
  log('resume after close: button', JSON.stringify(cont.trim()), '→ continued at', tl.split('·')[0].trim(), '· task time incl. before close:', s4, 's');
  const daySum = Object.values(L.daySec).reduce((a, b) => a + b, 0), parts = L.cardSec + L.answers.reduce((a, x) => a + x.sec, 0);
  expect(Math.abs(daySum - parts) <= 3, `daySec ${daySum} vs parts ${parts}`);
  log('per-day total', Math.round(daySum), 's = cards + tasks', parts, 's · sessions', L.sessions.length);
  await ctx.close();
}

// ───────────── 3+5: dashboard + weekly reminder ─────────────
const [A, B] = demoPair();
let urlA, urlB;
{
  const ctx = await b.newContext(dev);
  await ctx.addInitScript(() => { navigator.share = async (d) => { window.__shared = d; }; });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await seedDemo(page, [A, B], DEMO_TODAY);
  await page.reload();
  await page.locator('.pbtn', { hasText: 'Ema' }).click();
  // Sunday → weekly reminder on Dnes
  await page.getByText('Pošli rodičům týdenní přehled').waitFor();
  await page.screenshot({ path: SHOTS + 'parent-local-reminder.png' });
  await page.getByRole('button', { name: 'Skrýt připomínku' }).click();
  expect(!(await page.getByText('Pošli rodičům týdenní přehled').count()), 'reminder not dismissed');
  await page.evaluate(() => localStorage.setItem('doucovani:today', '2026-11-30')); // Monday, same report week
  await page.reload(); await page.locator('.pbtn', { hasText: 'Ema' }).click(); await page.getByText('Dnešní lekce').waitFor();
  expect(!(await page.getByText('Pošli rodičům týdenní přehled').count()), 'reminder came back after dismissal');
  await page.evaluate(() => localStorage.setItem('doucovani:today', '2026-12-06')); // next Sunday → again
  await page.reload(); await page.locator('.pbtn', { hasText: 'Ema' }).click();
  await page.getByText('Pošli rodičům týdenní přehled').waitFor();
  log('weekly reminder: Sunday shown → dismissed → Monday hidden → next Sunday shown');
  await page.evaluate((d) => localStorage.setItem('doucovani:today', d), DEMO_TODAY);
  await page.reload(); await page.locator('.pbtn', { hasText: 'Ema' }).click();
  // Rodič dashboard
  await page.locator('.tabs button', { hasText: 'Rodič' }).click();
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.locator('.dash').waitFor();
  const kpi = await page.locator('.kpi b').allTextContents();
  const strong = await page.locator('.tlist.strong .trow').count(), weak = await page.locator('.tlist.weak .trow').count();
  const mis = await page.locator('ul.mis li').count(), mocks = await page.locator('.mocklist li').count();
  const bench = await page.getByText('průměru přijatých').count();
  log('dashboard KPIs:', kpi.join(' | '), '· strong', strong, '· weak', weak, '· mistakes', mis, '· mocks', mocks, '· benchmark note', bench);
  expect(kpi.length === 4 && strong > 0 && weak > 0 && mis > 0 && mocks === 4 && bench === 1, 'dashboard sections incomplete');
  const bars = await page.locator('svg.daily rect').count();
  expect(bars > 15, `daily bars ${bars}`);
  await page.screenshot({ path: SHOTS + 'parent-local-dashboard.png', fullPage: true });
  // share A
  await page.getByRole('button', { name: /Poslat přehled rodičům/ }).click();
  await page.waitForFunction(() => window.__shared);
  urlA = await page.evaluate(() => window.__shared.url);
  // switch to B and share
  await page.locator('.seg button', { hasText: 'Klára' }).click();
  await page.getByText('6leté gymnázium · 7. třída').waitFor();
  expect(await page.getByText('není k dispozici').count() === 1, 'g6 benchmark notice missing');
  await page.evaluate(() => { window.__shared = null; });
  await page.getByRole('button', { name: /Poslat přehled rodičům/ }).click();
  await page.waitForFunction(() => window.__shared);
  urlB = await page.evaluate(() => window.__shared.url);
  log('share links: A', urlA.length, 'chars · B', urlB.length, 'chars');
  expect(urlA.includes('#r=z') && urlA.length < 8000 && urlB.length < 8000, 'share URL too long or not compressed');
  const sent = await page.evaluate(() => JSON.parse(localStorage.getItem('doucovani:v1:global')).reportSent);
  expect(sent?.demoA === '2026-11-23', `report week tracking ${JSON.stringify(sent)}`);
  // fallback without navigator.share → copy link + visible field
  await page.evaluate(() => { delete navigator.share; navigator.share = undefined; });
  await page.getByRole('button', { name: /Poslat přehled rodičům/ }).click();
  await page.locator('textarea.replink').waitFor();
  log('fallback without share sheet: link field shown');
  // worst case size: full plan of data (until the exams)
  const big = demoProfile({ id: 'big', name: 'Velký', emoji: '🐻', color: '#4d7fb8', track: 'g6', english: true, today: '2027-04-11', skill: 0.6, seed: 5, skipRate: 0 });
  await seedDemo(page, [big], '2027-04-11');
  await page.reload();
  await page.locator('.pbtn').first().click();
  await page.locator('.tabs button', { hasText: 'Rodič' }).click();
  for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
  await page.locator('textarea.replink').count();
  await page.evaluate(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d; }; });
  await page.getByRole('button', { name: /Poslat přehled rodičům/ }).click();
  await page.waitForFunction(() => window.__shared);
  const bigLen = await page.evaluate(() => window.__shared.url.length);
  log('worst-case link (whole school year of data):', bigLen, 'chars');
  expect(bigLen < 8000, `big URL ${bigLen}`);
  await ctx.close();
}

// ───────────── 4: parent's phone – roundtrip ─────────────
{
  const ctx = await b.newContext(dev);
  const page = await ctx.newPage();
  await page.goto(urlA);
  await page.locator('.dash').waitFor();
  const at = await page.locator('.snapat').textContent();
  expect(await page.getByText('Přehled (Ema) uložen').count() === 1, 'report not saved');
  expect(!(await page.locator('.tabs').count()) && !(await page.locator('.pad').count()), 'report page should have no PIN/tab bar');
  log('parent phone: report for Ema opened, snapshot', at, '· hash now', await page.evaluate(() => location.hash));
  await page.screenshot({ path: SHOTS + 'parent-local-report.png' });
  await page.goto(urlB);
  await page.locator('.compare').waitFor();
  const heads = await page.locator('.compare th div').allTextContents();
  expect(heads.join(',') === 'Ema,Klára', `compare heads ${heads}`);
  await page.screenshot({ path: SHOTS + 'parent-local-compare.png', fullPage: true });
  // older link must not replace the newer one
  const older = await page.evaluate(async (u) => u, urlA);
  await page.goto(older);
  await page.locator('.dash').waitFor();
  const saved = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('doucovani:v1:reports'))).length);
  expect(saved === 2, `saved reports ${saved}`);
  // reopen app without hash → setup shows link to reports
  await page.goto(BASE);
  await page.getByRole('button', { name: /Přehledy od dětí/ }).click();
  await page.locator('.compare').waitFor();
  log('parent phone: 2 reports saved, side-by-side compare:', heads.join(' | '), '· reachable from start screen');
  await ctx.close();
}
await b.close();
if (errors.length) { console.error('✗ parent errors:\n' + errors.join('\n')); process.exit(1); }
console.log('✓ parent/time/report e2e passed');
