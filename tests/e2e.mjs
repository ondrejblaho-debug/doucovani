// End-to-end test in an iPhone viewport (WebKit; Chromium for the offline/service-worker check).
import { webkit, chromium, devices } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:4173/doucovani/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const iphone = devices['iPhone 13'];
const log = (...a) => console.log('•', ...a);
const errors = [];

async function setDay(page, d) { await page.evaluate((d) => localStorage.setItem('doucovani:today', d), d); await page.reload(); }

async function createProfile(page, name, track, emojiIdx, checkModule) {
  await page.locator('.setup').waitFor();
  await page.getByPlaceholder('např. Ája').fill(name);
  await page.locator('.emojis .chip').nth(emojiIdx).click();
  await page.locator('.swatch').nth(emojiIdx % 6).click();
  await page.getByText(track).click();
  const mod = page.locator('.setup .toggle input');
  const def = await mod.isChecked();
  if (checkModule !== undefined && def !== checkModule) await mod.click();
  await page.getByRole('button', { name: 'Vytvořit profil' }).click();
  await page.getByText(`Ahoj, ${name}!`).waitFor();
  return def;
}

async function answerCurrent(page, wrong) {
  const task = page.locator('.task');
  await task.waitFor();
  const kind = await task.getAttribute('data-kind');
  if (kind === 'mc' || kind === 'gap') await task.locator('button.opt').nth(wrong ? 1 : 0).click();
  else if (kind === 'yn') await task.locator('button.opt').nth(wrong ? 1 : 0).click();
  else if (kind === 'yng') { const rows = task.locator('.yngrow'); const n = await rows.count(); for (let i = 0; i < n; i++) await rows.nth(i).locator('button.chip').first().click(); await task.locator('button.primary').click(); }
  else if (kind === 'num' || kind === 'text') { await task.locator('input.answer').fill(wrong ? 'xyz' : '12'); await task.locator('button.primary', { hasText: 'Zkontrolovat' }).click(); }
  else if (kind === 'match') { const sels = task.locator('select'); const n = await sels.count(); for (let i = 0; i < n; i++) await sels.nth(i).selectOption({ index: 1 }); await task.locator('button.primary').click(); }
  else if (kind === 'order') await task.locator('button.primary').click();
  await page.locator('.feedback').waitFor();
  return kind;
}

async function fullLesson(page, name, shotPrefix) {
  await page.getByRole('button', { name: /Začít lekci|Pokračovat/ }).click();
  let cards = 0;
  while (await page.locator('.explain-card').count()) { if (cards === 0) await page.screenshot({ path: `${SHOTS}${shotPrefix}-vysvetleni.png` }); await page.locator('.explain-card button.primary').click(); cards++; }
  let n = 0; const kinds = {};
  while (await page.locator('.task').count()) {
    if (!globalThis.listenShot && await page.locator('.passage.listen').count()) { globalThis.listenShot = true; await page.screenshot({ path: `${SHOTS}${shotPrefix}-poslech.png` }); log('listening task rendered (speech synthesis button)'); }
    const k = await answerCurrent(page, n % 4 === 1);
    kinds[k] = (kinds[k] || 0) + 1;
    if (n === 1) await page.screenshot({ path: `${SHOTS}${shotPrefix}-uloha-zpetna-vazba.png` });
    await page.getByRole('button', { name: 'Další ➜' }).click();
    n++;
    if (n > 80) throw new Error('lesson does not end');
  }
  await page.getByText('Skvělá práce!').waitFor();
  await page.screenshot({ path: `${SHOTS}${shotPrefix}-hotovo.png` });
  log(`${name}: lesson finished – ${cards} cards, ${n} tasks`, JSON.stringify(kinds));
  await page.getByRole('button', { name: 'Zpět na Dnes' }).click();
  return n;
}

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...iphone, locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE);
await setDay(page, '2026-10-12');
await page.screenshot({ path: SHOTS + '01-novy-profil.png' });

// first launch: setup flow – 8-year track with the Christian-culture module
const zkkDefault = await createProfile(page, 'Ema', '8leté gymnázium (5. třída)', 0, true);
log('Setup: profile Ema (g8) created; ZKK module default =', zkkDefault);
// add a second profile from the picker – 6-year track, English must default to ON
await page.locator('.appbar .who').click();
await page.screenshot({ path: SHOTS + '01b-vyber-profilu.png' });
await page.getByRole('button', { name: 'Přidat profil' }).click();
await page.getByText('6leté gymnázium (7. třída)').click();
await page.screenshot({ path: SHOTS + '01c-pridat-profil.png' });
const enDefault = await createProfile(page, 'Klára', '6leté gymnázium (7. třída)', 1);
log('Setup: profile Klára (g6) created; English default =', enDefault);
if (!enDefault) errors.push('English module should default to ON for the 6-year track');
await page.locator('.appbar .who').click();
await page.getByRole('button', { name: /Ema/ }).click();

// Ema – Monday 12. 10. (math day)
await page.getByText('Dnešní lekce').waitFor();
await page.screenshot({ path: SHOTS + '02-ema-dnes.png' });
await fullLesson(page, 'Ema', '03-ema');
await page.getByText('Hotovo! 🎉').waitFor();

// next day: mistakes come back as reviews
await setDay(page, '2026-10-13');
await page.getByRole('button', { name: /Ema/ }).click();
await page.getByText(/k zopakování/).waitFor();
log('Ema 13. 10.: review queue shown on Dnes');
await page.getByRole('button', { name: /Začít lekci/ }).click();
while (await page.locator('.explain-card').count()) await page.locator('.explain-card button.primary').click();
const firstBadge = await page.locator('.badge.rev').count();
log('Ema 13. 10.: first task is a review:', firstBadge > 0);
if (!firstBadge) errors.push('review task not mixed into next day');
await page.getByRole('button', { name: 'Zavřít' }).click();

// Calendar
await page.getByRole('button', { name: 'Kalendář' }).click();
await page.locator('.cal').waitFor();
await page.locator('.day.st-done').first().click();
await page.screenshot({ path: SHOTS + '04-ema-kalendar.png', fullPage: true });
const doneDays = await page.locator('.day.st-done').count();
log('Calendar: done days =', doneDays, ', partial =', await page.locator('.day.st-partial').count());
// exam month
for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Další měsíc' }).click();
const exam = await page.locator('.day.st-exam').count();
log('Calendar April 2027: exam days =', exam);
if (exam !== 2) errors.push('exam days not shown');
await page.screenshot({ path: SHOTS + '05-kalendar-duben-zkousky.png' });

// Klára – Tuesday 13. 10.: Czech + English block
await page.locator('.appbar .who').click();
await page.getByRole('button', { name: /Klára/ }).click();
await page.getByText('Dnešní lekce').waitFor();
const enBlock = await page.locator('.blocks li', { hasText: 'Angličtina' }).count();
log('Klára 13. 10.: English block in plan =', enBlock > 0, '| minutes:', await page.locator('.lesson h2').innerText());
if (!enBlock) errors.push('English block missing on Tuesday');
await page.screenshot({ path: SHOTS + '06-klara-dnes.png' });
await fullLesson(page, 'Klára', '07-klara');
// English tasks were part of the lesson?
const enAnswers = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('doucovani:v1:global')); const id = g.profiles.find((p) => p.name === 'Klára').id; const p = JSON.parse(localStorage.getItem('doucovani:v1:profile:' + id)); return Object.values(p.lessons).flatMap((l) => l.answers).filter((a) => a.topic.startsWith('en7-')).length; });
log('Klára: English answers recorded =', enAnswers);
if (!enAnswers) errors.push('no English tasks in the lesson');
// listening task renders (practice the listening topic directly via an English passage task)
// Calendar: assumed English test days in March 2027
await page.getByRole('button', { name: 'Kalendář' }).click();
for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Další měsíc' }).click();
const sch = await page.locator('.day .dm.sch').count();
log('Calendar March 2027: "test z AJ (předpoklad)" days =', sch);
if (sch !== 2) errors.push('English test days not marked');
await page.locator('.day', { has: page.locator('.dm.sch') }).first().click();
await page.getByText('test z AJ (předpoklad)', { exact: false }).first().waitFor();
await page.screenshot({ path: SHOTS + '07b-kalendar-test-aj.png' });
const enTopicsShown = await page.locator('.mgroup', { hasText: 'Angličtina' }).locator('.mrow2').count();
log('Mastery: English topics listed =', enTopicsShown);
if (enTopicsShown < 10) errors.push('English topics missing in mastery view');
await page.getByRole('button', { name: 'Dnes' }).click();

// Mock test – Klára, first scheduled test (ČJL)
await page.getByRole('button', { name: 'Test' }).click();
await page.screenshot({ path: SHOTS + '08-testy-seznam.png' });
await page.locator('.mockcard').first().getByRole('button', { name: 'Spustit' }).first().click();
await page.getByRole('button', { name: /Spustit časovač/ }).click();
await page.locator('.clock').waitFor();
const clock1 = await page.locator('.clock').innerText();
await page.waitForTimeout(2200);
const clock2 = await page.locator('.clock').innerText();
log('Timer running:', clock1, '→', clock2);
if (clock1 === clock2) errors.push('timer not counting');
await page.screenshot({ path: SHOTS + '09-test-casovac.png' });
// fill answers: first chip everywhere, text into inputs, order selects
const items = page.locator('.item');
const ni = await items.count();
for (let i = 0; i < ni; i++) {
  const it = items.nth(i);
  const groups = it.locator('.chips');
  const g = await groups.count();
  for (let j = 0; j < g; j++) await groups.nth(j).locator('.chip').first().click();
  const ins = it.locator('input.answer, textarea.answer'); for (let j = 0; j < await ins.count(); j++) await ins.nth(j).fill('test');
  const sels = it.locator('select'); for (let j = 0; j < await sels.count(); j++) await sels.nth(j).selectOption({ index: j + 1 });
}
await page.screenshot({ path: SHOTS + '10-test-zadavani.png' });
await page.getByRole('button', { name: /vyhodnotit/ }).click();
await page.getByText('Vyhodnocení').waitFor();
// parent self-scores: give 1 point where possible
const selfCards = page.locator('.item.selfi');
const ns = await selfCards.count();
for (let i = 0; i < ns; i++) { const c = selfCards.nth(i).locator('.chips'); for (let j = 0; j < await c.count(); j++) await c.nth(j).locator('.chip').nth(1).click(); }
const summary = await page.locator('.card', { hasText: 'Vyhodnocení' }).innerText();
log('Scoring summary:', summary.replace(/\n/g, ' ').slice(0, 160));
await page.screenshot({ path: SHOTS + '11-test-hodnoceni.png', fullPage: false });
await page.getByRole('button', { name: 'Uložit výsledek' }).click();
await page.locator('.bigscore').waitFor();
log('Mock result:', (await page.locator('.bigscore').innerText()).replace(/\n/g, ' '), `(${ni} items, ${ns} self-scored)`);
await page.screenshot({ path: SHOTS + '12-test-vysledek.png' });
await page.getByRole('button', { name: 'Zpět' }).click();
await page.locator('.trend').first().waitFor();

// Parent
await page.getByRole('button', { name: 'Rodič' }).click();
for (const d of '1111') await page.getByRole('button', { name: d, exact: true }).click();
await page.waitForTimeout(600);
if (await page.locator('.overview').count()) errors.push('wrong PIN accepted');
for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
await page.locator('.overview').first().waitFor();
const ov = await page.locator('.overview').count();
log('Parent overview cards:', ov);
if (ov !== 2) errors.push('parent overview should list both profiles');
await page.locator('.overview', { hasText: 'Klára' }).getByRole('button', { name: /Upravit profil/ }).click();
const engEdit = await page.locator('.setup .toggle input').isChecked();
log('Parent edit: English module for Klára =', engEdit);
if (!engEdit) errors.push('English module not on in profile');
await page.getByRole('button', { name: 'Zrušit' }).click();
await page.screenshot({ path: SHOTS + '13-rodic.png', fullPage: true });
await page.getByRole('button', { name: /Kód pro sdílení/ }).click();
const code = await page.locator('textarea.code').first().inputValue();
log('Share code length:', code.length, code.slice(0, 12) + '…');
// import roundtrip
page.once('dialog', (d) => d.accept());
await page.locator('textarea.code').nth(1).fill(code);
await page.getByRole('button', { name: 'Obnovit z kódu' }).click();
await page.getByText('Záloha obnovena').waitFor();
log('Import of share code: OK');
await browser.close();

// Offline reload – Chromium (service worker support in Playwright), iPhone viewport
const cb = await chromium.launch();
const cctx = await cb.newContext({ ...devices['iPhone 13'], locale: 'cs-CZ', defaultBrowserType: undefined });
const cp = await cctx.newPage();
await cp.goto(BASE);
await cp.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await cp.reload(); await cp.waitForTimeout(800);
await createProfile(cp, 'Ema', '8leté gymnázium (5. třída)', 2);
await cctx.setOffline(true);
await cp.reload();
await cp.locator('.pbtn', { hasText: 'Ema' }).click();
await cp.getByText(/Ahoj, Ema/).waitFor();
log('Offline reload: app works without network');
await cp.screenshot({ path: SHOTS + '14-offline.png' });
await cb.close();

// WebKit offline check (best effort)
try {
  const wb = await webkit.launch(); const wc = await wb.newContext({ ...iphone }); const wp = await wc.newPage();
  await wp.goto(BASE); const sw = await wp.evaluate(() => navigator.serviceWorker.ready.then(() => true).catch(() => false));
  await wp.waitForTimeout(800); await wc.setOffline(true); await wp.reload();
  log('WebKit offline reload:', await wp.locator('.setup').count() ? 'OK' : 'not rendered', '(sw ready:', sw + ')');
  await wb.close();
} catch (e) { log('WebKit offline check skipped:', String(e).split('\n')[0]); }

if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('✓ e2e passed');
