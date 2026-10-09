// Automated validation of the static bank + all math generators.
import './sync-data';
import { CARDS } from '../src/content/cards';
// Run: npm run validate   (fails the build on any error)
import { readFileSync, writeFileSync } from 'node:fs';
import { compile } from './compile-bank';
import { GENERATORS, runGenerator } from '../src/gen/math';
import { CZ_GENERATORS, runCzGenerator } from '../src/gen/czech';
import { checkAnswer } from '../src/lib/check';
import { parseNum, gcd, lcm, normalizeAnswer } from '../src/lib/num';
import type { Task } from '../src/lib/types';

const cur = JSON.parse(readFileSync(new URL('../data/curriculum.json', import.meta.url), 'utf8'));
const catalog: Record<string, string> = {};
for (const g of Object.keys(cur.topicCatalog)) for (const subj of Object.keys(cur.topicCatalog[g])) for (const t of cur.topicCatalog[g][subj]) catalog[t.id] = g;

const errors: string[] = [];
const err = (where: string, msg: string) => { if (errors.length < 5000) errors.push(`${where}: ${msg}`); };

function structural(t: Task, where: string) {
  const texts = [t.prompt, t.explain, ...(t.options || []), ...(t.answers || []), ...(t.items || []), ...(t.pairs || []).flat(), ...(t.statements || []).map((s) => s.s)];
  for (const s of texts) {
    if (typeof s !== 'string' || !s.trim()) { err(where, 'empty text'); continue; }
    if (/undefined|NaN|Infinity|\[object|−0(?![,\d])|\b-0\b/.test(s)) err(where, 'bad token in: ' + s);
    if (/  (?!\n)/.test(s.replace(/\n/g, ''))) err(where, 'double space in: ' + s);
  }
  if (!catalog[t.topic]) err(where, 'unknown topic ' + t.topic);
  if (!t.explain || t.explain.length < 3) err(where, 'missing explanation');
  switch (t.kind) {
    case 'mc': case 'gap': {
      const o = t.options || [];
      if (o.length < 2) err(where, 'mc needs ≥2 options');
      if (new Set(o.map((x) => x.trim().replace(/\s+/g, ' '))).size !== o.length) err(where, 'duplicate options ' + o.join(' | '));
      if (t.correct === undefined || t.correct < 0 || t.correct >= o.length) err(where, 'bad correct index');
      break;
    }
    case 'yn': if (typeof t.answer !== 'boolean') err(where, 'yn without answer'); break;
    case 'yng': if (!t.statements?.length) err(where, 'yng without statements'); break;
    case 'num': {
      if (!t.answers?.length) { err(where, 'num without answers'); break; }
      if (!t.strict) for (const a of t.answers) if (isNaN(parseNum(a))) err(where, 'unparseable numeric answer ' + a);
      break;
    }
    case 'text': if (!t.answers?.length) err(where, 'text without answers'); break;
    case 'match': {
      const p = t.pairs || [];
      if (p.length < 2) err(where, 'match needs ≥2 pairs');
      if (new Set(p.map((x) => x[0])).size !== p.length) err(where, 'duplicate left side');
      break;
    }
    case 'order': if ((t.items || []).length < 3 || new Set(t.items).size !== t.items!.length) err(where, 'order needs ≥3 unique items'); break;
  }
  // the canonical answer must be accepted by the checker
  const resp: any =
    t.kind === 'mc' || t.kind === 'gap' ? t.correct : t.kind === 'yn' ? t.answer : t.kind === 'yng' ? t.statements!.map((s) => s.a)
    : t.kind === 'match' ? t.pairs!.map((p) => p[1]) : t.kind === 'order' ? t.items : t.answers![0];
  if (!checkAnswer(t, resp)) err(where, 'checker rejects canonical answer');
  if (t.kind === 'num' && !t.strict && t.answers && checkAnswer(t, String(parseNum(t.answers[0]) + 1))) err(where, 'checker accepts wrong answer');
}

// ---------- independent recomputation for generators ----------
function evalExpr(e: string): number {
  if (!/^[\d+\-*/%().]+$/.test(e)) throw new Error('unsafe expr ' + e);
  return Function(`"use strict";return (${e})`)();
}
function reduceFrac(n: number, d: number): string { const g = gcd(n, d); n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return d === 1 ? String(n) : `${n}/${d}`; }
const ans = (t: Task) => parseNum(t.answers![0]);

function independent(t: Task, where: string) {
  const m = (t.meta || {}) as any;
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  const expect = (v: number) => { if (!close(ans(t), v)) err(where, `answer ${t.answers![0]} ≠ independent ${v} | ${t.prompt}`); };
  if (m.expr) expect(evalExpr(String(m.expr)));
  if (m.f === 'gcd') { let g = 1; for (let i = 1; i <= Math.min(m.a, m.b); i++) if (m.a % i === 0 && m.b % i === 0) g = i; expect(g); }
  if (m.f === 'lcm') { let l = Math.max(m.a, m.b); while (l % m.a || l % m.b) l++; expect(l); }
  if (m.f === 'part') expect((m.p / 100) * m.z);
  if (m.f === 'promile') expect((m.p / 1000) * m.z);
  if (m.f === 'pct') expect((m.c / m.z) * 100);
  if (m.f === 'base') expect(m.c / (m.p / 100));
  if (m.n !== undefined && m.k !== undefined && t.gen === 'm5-zaokrouhli') expect(Math.floor(m.n / m.k + 0.5) * m.k);
  if (t.gen === 'm7-zlomky-scit' || t.gen === 'm7-zlomky-nasob') {
    const { a, b, c, d, op } = m; let n = 0, q = 1;
    if (op === '+') { n = a * d + b * c; q = b * d; } else if (op === '-') { n = a * d - b * c; q = b * d; } else if (op === '*') { n = a * c; q = b * d; } else { n = a * d; q = b * c; }
    const exp = reduceFrac(n, q);
    if (normalizeAnswer(t.answers![0]) !== normalizeAnswer(exp)) err(where, `fraction ${t.answers![0]} ≠ ${exp}`);
  }
  if (t.gen === 'm7-zlomky-kraceni') { if (normalizeAnswer(t.answers![0]) !== reduceFrac(m.n, m.m)) err(where, 'krácení'); if (!t.prompt.includes(`${m.n}/${m.m}`)) err(where, 'krácení prompt'); }
  if (t.gen === 'm7-pomer-kraceni') { const g = gcd(m.a, m.b); if (normalizeAnswer(t.answers![0]) !== `${m.a / g}:${m.b / g}`) err(where, 'poměr'); }
  if (t.gen === 'm7-pomer-deleni') expect((m.total * m.a) / (m.a + m.b));
  if (t.gen === 'm7-pomer-zmena') expect((m.n * m.a) / m.b);
  if (t.gen === 'm7-meritko') expect((m.cm * m.m) / 100 / 1000);
  if (t.gen === 'm7-neprima') expect((m.w1 * m.d1) / m.w2);
  if (t.gen === 'm7-slovni-spolecna') expect(60 / (1 / m.a + 1 / m.b));
  if (t.gen === 'm7-sleva') expect(m.price + (m.up ? 1 : -1) * (m.price * m.p) / 100);
  if (t.gen === 'm7-zlomek-desetinne') expect(m.n / m.m);
  if (t.gen === 'm7-smisene') { if (normalizeAnswer(t.answers![0]) !== `${m.w * m.m + m.n}/${m.m}`) err(where, 'smíšené'); }
  if (t.gen === 'm7-zaokrouhli-des') { const f = 10 ** m.places; expect(Math.round(Math.round(m.a * 1000) * f / 1000 + 1e-9) / f); }
  if (t.gen === 'm7-desetinna') { const v = m.op === '+' ? m.a + m.b : m.op === '−' ? m.a - m.b : m.a * m.b; expect(Math.round(v * 1e6) / 1e6); }
  if (t.gen === 'm7-desetinna-01') expect(Math.round((m.mult ? m.a * m.k : m.a / m.k) * 1e6) / 1e6);
  if (t.gen === 'm7-prumer') expect(m.vals.reduce((x: number, y: number) => x + y, 0) / m.vals.length);
  if (t.gen === 'm7-uhel-minuty') { const tot = (m.d1 + m.d2) * 60 + m.m1 + m.m2; if (!t.answers!.includes(`${Math.floor(tot / 60)}°${tot % 60}′`)) err(where, 'úhly'); }
  if (t.gen === 'm5-porovnej' || t.gen === 'm5-desetinne-porovnej') {
    const exp = t.gen === 'm5-porovnej' ? (m.a < m.b ? '<' : m.a > m.b ? '>' : '=') : String(Math.max(m.a, m.b)).replace('.', ',');
    if (t.kind === 'mc' && t.options![t.correct!] !== exp) err(where, `porovnání ${t.options![t.correct!]} ≠ ${exp}`);
  }
  if (t.gen === 'm5-kalendar') { if (t.correct !== (m.d0 + m.add) % 7) err(where, 'kalendář'); }
  if (t.gen === 'm7-delitelnost-yn') { if (t.answer !== (m.n % m.k === 0)) err(where, 'dělitelnost'); }
  if (t.gen === 'm7-prvocislo') { for (let i = 0; i < t.options!.length; i++) { const v = Number(t.options![i]); let pr = v > 1; for (let d = 2; d * d <= v; d++) if (v % d === 0) pr = false; if (pr !== (i === t.correct)) err(where, 'prvočíslo ' + v); } }
  if (t.gen === 'm7-rozklad') { const c = t.options![t.correct!].split(' · ').map(Number); if (c.reduce((a, b) => a * b, 1) !== m.n) err(where, 'rozklad součin'); t.options!.forEach((o, i) => { if (i !== t.correct) { const f = o.split(' · ').map(Number); const allPrime = f.every((v) => { if (v < 2) return false; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true; }); if (allPrime && f.reduce((a, b) => a * b, 1) === m.n) err(where, 'second valid rozklad'); } }); }
}

// plausibility: answers that must be whole and non-negative
const COUNT_UNITS = new Set(['samolepek', 'kuliček', 'dětí', 'žáků', 'krychliček', 'min', 's']);
function plausible(t: Task, where: string) {
  if (t.kind !== 'num' || t.strict) return;
  const v = ans(t);
  if (((t.unit && COUNT_UNITS.has(t.unit)) || (t.meta as any)?.count) && (!Number.isInteger(v) || v < 0)) err(where, `implausible count ${v} ${t.unit} | ${t.prompt}`);
  if (t.unit === 'Kč' && (v < 0 || Math.abs(v * 100 - Math.round(v * 100)) > 1e-6)) err(where, `implausible money ${v}`);
  if (t.grade === 5 && t.topic !== 'm5-desetinna-zaporna' && v < 0) err(where, `negative answer for grade 5: ${v} | ${t.prompt}`);
  if (t.unit === '°' && (v <= 0 || v >= 360)) err(where, `bad angle ${v}`);
  if (t.unit === 'cm' && v <= 0) err(where, 'non-positive length');
  if (t.grade === 5 && t.unit === 'dní' && !Number.isInteger(v)) err(where, 'fractional days');
}

// ---------- run ----------
const { tasks, passages, errors: compileErrors } = compile();
compileErrors.forEach((e) => err('compile', e));
const ids = new Set<string>();
for (const t of tasks) {
  if (ids.has(t.id)) err(t.id, 'duplicate id'); ids.add(t.id);
  if (t.passage && !passages[t.passage]) err(t.id, 'missing passage ' + t.passage);
  structural(t, t.id);
}
// near-duplicate prompts in static bank
const seenPrompt = new Map<string, string>();
for (const t of tasks) { const k = t.topic + "|" + t.prompt + "|" + (t.gapText || []).join("_") + "|" + JSON.stringify(t.options || t.pairs || t.statements || t.items || t.answers || t.answer); if (seenPrompt.has(k) && t.kind !== 'yng') err(t.id, 'duplicate prompt with ' + seenPrompt.get(k)); else seenPrompt.set(k, t.id); }

const SEEDS = Number(process.env.SEEDS || 3000);
const genStats: Record<string, number> = {};
for (const g of GENERATORS) {
  const distinct = new Set<string>();
  for (let s = 1; s <= SEEDS; s++) {
    const where = `${g.id}#${s}`;
    let t: Task;
    try { t = runGenerator(g, s); } catch (e) { err(where, 'threw ' + e); continue; }
    if (t.grade !== Number(catalog[t.topic])) err(where, 'grade mismatch');
    structural(t, where); independent(t, where); plausible(t, where);
    distinct.add(t.prompt + '|' + (t.options || []).slice().sort().join('|'));
  }
  genStats[g.id] = distinct.size;
  if (distinct.size < Math.min(5, SEEDS)) err(g.id, `only ${distinct.size} distinct prompts`);
}
for (const g of CZ_GENERATORS) {
  const distinct = new Set<string>();
  for (let s = 1; s <= SEEDS; s++) {
    const where = `${g.id}#${s}`;
    let t: Task;
    try { t = runCzGenerator(g, s); } catch (e) { err(where, 'threw ' + e); continue; }
    structural(t, where); distinct.add(t.prompt + (t.gapText || []).join('') + (t.options || []).join());
  }
  genStats[g.id] = distinct.size;
}

// ---- English: independent answer checks ----
const IRREG: Record<string, string> = { go: 'went', see: 'saw', write: 'wrote', buy: 'bought', take: 'took', eat: 'ate', come: 'came', give: 'gave', think: 'thought', drink: 'drank', teach: 'taught', lose: 'lost', catch: 'caught', carry: 'carried', stop: 'stopped' };
const PLURAL: Record<string, string> = { child: 'children', mouse: 'mice', foot: 'feet', woman: 'women', box: 'boxes', knife: 'knives', baby: 'babies', sheep: 'sheep' };
const COMP: Record<string, [string[], string[]]> = { happy: [['happier'], ['happiest']], good: [['better'], ['best', 'the best']], bad: [['worse'], ['worst']], big: [['bigger'], ['biggest', 'the biggest']], far: [['farther', 'further'], ['farthest', 'furthest']] };
const qn = (x: string) => x.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ');
const correctOf = (t: Task): string[] => t.kind === 'mc' || t.kind === 'gap' ? [t.options![t.correct!]] : t.answers || [];
let enChecked = 0;
for (const t of tasks) {
  if (!t.topic.startsWith('en7-')) continue;
  const c = correctOf(t).map((x) => x.toLowerCase());
  let m = t.prompt.match(/(?:Past simple of|minulý čas slovesa) „(\w+)“/);
  if (m) { enChecked++; if (!IRREG[m[1]]) err(t.id, 'verb not in independent table ' + m[1]); else if (!c.includes(IRREG[m[1]])) err(t.id, `past of ${m[1]} should be ${IRREG[m[1]]}, got ${c}`); }
  m = t.prompt.match(/(?:Plural of|množné číslo slova) „(\w+)“/);
  if (m) { enChecked++; if (!PLURAL[m[1]]) err(t.id, 'noun not in table ' + m[1]); else if (!c.includes(PLURAL[m[1]])) err(t.id, `plural of ${m[1]} should be ${PLURAL[m[1]]}`); }
  m = t.prompt.match(/(Comparative|Superlative) of „(\w+)“|(2|3)\. stupeň přídavného jména „(\w+)“/);
  if (m) { enChecked++; const w = m[2] || m[4]; const sup = m[1] === 'Superlative' || m[3] === '3'; const exp = COMP[w]?.[sup ? 1 : 0]; if (!exp) err(t.id, 'adj not in table ' + w); else if (!c.some((x) => exp.includes(x))) err(t.id, `degree of ${w} should be ${exp}`); }
  // text answers must be English (no Czech letters)
  if (t.kind === 'text' && t.answers!.some((a) => /[ěščřžýáíéůú]/i.test(a))) err(t.id, 'czech letters in English answer');
  // reading/listening: every English quote in the explanation must be found in the passage (evidence check)
  if (t.passage) {
    const ptxt = qn(passages[t.passage].text.replace(/\n+/g, ' '));
    for (const q of t.explain.matchAll(/„([^“]+)“/g)) {
      const frag = qn(q[1]).replace(/^…|…$/g, '').replace(/\.\.\.$/, '').trim();
      if (/[a-z]{2,} [a-z]/i.test(frag) && !/[ěščřžýáíéůú]/i.test(frag)) {
        enChecked++;
        for (const part of frag.split('…').map((x) => x.trim()).filter((x) => x.length > 3)) if (!ptxt.includes(part)) err(t.id, 'quoted evidence not in passage: ' + part);
      }
    }
    if (passages[t.passage].audio && t.kind !== 'mc') err(t.id, 'listening tasks must be mc');
  }
  if (t.kind === 'mc' && /True; False|^True$/.test((t.options || []).join('; ')) && !t.passage) err(t.id, 'T/F/NG without passage');
}
console.log(`English independent checks: ${enChecked}`);

// coverage per topic
const cover: Record<string, { stat: number; gens: number }> = {};
for (const id of Object.keys(catalog)) cover[id] = { stat: 0, gens: 0 };
for (const t of tasks) cover[t.topic].stat++;
for (const g of [...GENERATORS, ...CZ_GENERATORS]) cover[g.topic].gens++;
const low: string[] = [];
for (const [id, c] of Object.entries(cover)) {
  if (id.endsWith('-mix')) continue; // mixes draw from all topics
  if (c.stat < 15 && c.gens === 0) low.push(`${id} (${c.stat})`);
}
for (const id of Object.keys(catalog)) if (!CARDS[id]) err('cards', 'missing explanation card for ' + id);
for (const id of Object.keys(CARDS)) if (!catalog[id]) err('cards', 'card for unknown topic ' + id);
if (low.length) err('coverage', 'topics with <15 static tasks and no generator: ' + low.join(', '));

const summary = { staticTasks: tasks.length, passages: Object.keys(passages).length, generators: GENERATORS.length + CZ_GENERATORS.length, seedsPerGenerator: SEEDS, cover, genDistinctPrompts: genStats };
writeFileSync(new URL('../validation-report.json', import.meta.url), JSON.stringify({ ...summary, errors }, null, 1));
if (errors.length) { console.error(errors.join('\n')); console.error(`\n✗ ${errors.length} validation error(s)`); process.exit(1); }
writeFileSync(new URL('../src/generated/bank.json', import.meta.url), JSON.stringify({ tasks, passages }));
console.log(`✓ validation OK: ${tasks.length} static tasks, ${Object.keys(passages).length} passages, ${summary.generators} generators × ${SEEDS} seeds`);
