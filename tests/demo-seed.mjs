// Realistic DEMO progress data – used only by tests/screenshots, never shipped in the app bundle.
import { readFileSync } from 'fs';
const root = new URL('../', import.meta.url).pathname;
const bank = JSON.parse(readFileSync(root + 'src/generated/bank.json', 'utf8'));
const cur = JSON.parse(readFileSync(root + 'src/generated/curriculum.json', 'utf8'));
const keys = JSON.parse(readFileSync(root + 'src/generated/keys.json', 'utf8'));
const genSrc = readFileSync(root + 'src/gen/math.ts', 'utf8');
const GEN = {}; for (const m of genSrc.matchAll(/\{ id: '([^']+)', topic: '([^']+)'/g)) (GEN[m[2]] ||= []).push(m[1]);
const BY_TOPIC = {}; for (const t of bank.tasks) (BY_TOPIC[t.topic] ||= []).push(t);

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const from = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const add = (k, n) => { const d = from(k); d.setDate(d.getDate() + n); return key(d); };

/** skill: base probability of a correct answer; topicBias: per-topic-prefix adjustments. */
export function demoProfile({ id, name, emoji, color, track, english = false, zkk = false, today, skill = 0.72, bias = {}, seed = 1, skipRate = 0.1 }) {
  const r = rng(seed);
  const st = cur.students.find((s) => s.id === track);
  const data = { v: 1, lessons: {}, srs: {}, topics: {}, seen: {}, mocks: [], timers: {}, drafts: {} };
  const pTopic = {};
  const probOf = (t) => (pTopic[t] ??= Math.min(0.97, Math.max(0.25, skill + (Object.entries(bias).find(([p]) => t.startsWith(p))?.[1] || 0) + (r() - 0.5) * 0.3)));
  const start = st.weeks[0].weekStart;
  for (let d = start; d < today; d = add(d, 1)) {
    const wd = from(d).getDay();
    if (wd === 0) continue;
    const week = st.weeks.find((w) => w.weekStart <= d && d <= w.weekEnd);
    if (!week) continue;
    if (st.mockTests.some((m) => m.date === d)) continue;
    if (r() < skipRate) continue; // missed day
    const partial = r() < 0.08;
    const topics = [...week.matematika.topics, ...week.cestina.topics, ...(week.extra?.topics || []).filter((t) => (english || !t.startsWith('en7-')) && (zkk || !t.startsWith('zkk')))];
    const n = partial ? 6 : 14 + Math.floor(r() * 10);
    const answers = [];
    for (let i = 0; i < n; i++) {
      const t = topics[Math.floor(r() * topics.length)];
      const stat = BY_TOPIC[t] || [];
      const gens = GEN[t] || [];
      let tid;
      if (stat.length && (!gens.length || r() < 0.5)) tid = stat[Math.floor(r() * stat.length)].id;
      else if (gens.length) tid = `gen:${gens[Math.floor(r() * gens.length)]}:${1 + Math.floor(r() * 1e6)}`;
      else continue;
      const subject = t[0] === 'm' ? 'matematika' : t[0] === 'c' ? 'cestina' : 'extra';
      const ok = r() < probOf(t);
      const sec = Math.round(25 + r() * 70);
      answers.push({ id: tid, topic: t, subject, ok, sec });
      const ts = (data.topics[t] ||= { seen: 0, correct: 0, ema: 0.5, last: d });
      ts.seen++; if (ok) ts.correct++; ts.ema = ts.ema * 0.75 + (ok ? 0.25 : 0); ts.last = d;
      data.seen[tid] = (data.seen[tid] || 0) + 1;
      if (!ok) data.srs[tid] = { id: tid, topic: t, box: 0, due: add(d, 1), lapses: (data.srs[tid]?.lapses || 0) + 1 };
    }
    // a few repeated mistakes (same task wrong again) for realism
    for (const s of Object.values(data.srs).slice(0, 2)) if (r() < 0.1) { answers.push({ id: s.id, topic: s.topic, subject: s.topic[0] === 'm' ? 'matematika' : 'cestina', ok: false, sec: 60, review: true }); s.lapses++; data.topics[s.topic].seen++; }
    const cardSec = Math.round(60 + r() * 120);
    const total = cardSec + answers.reduce((a, x) => a + x.sec, 0);
    data.lessons[d] = { date: d, kind: 'daily', tasks: answers.map((a) => ({ id: a.id, block: '' })), cards: [], idx: answers.length, answers, cardSec, startedAt: from(d).getTime(), ...(partial ? {} : { finishedAt: from(d).getTime() + total * 1000 }), daySec: { [d]: total }, sessions: [{ start: from(d).getTime(), sec: total }] };
  }
  // mock tests done on schedule
  for (const m of st.mockTests.filter((m) => m.date < today)) {
    for (const subj of ['cestina', 'matematika']) {
      const code = m.testTerm.startsWith('1') ? 'A' : 'B';
      const k = keys.find((x) => x.grade === st.grade && x.subject === subj && x.year === m.testYear && x.termCode === code);
      if (!k) continue;
      const base = subj === 'cestina' ? skill + (bias.c || 0) : skill + (bias.m || 0);
      const pts = Math.max(8, Math.min(50, Math.round(50 * (base - 0.12 + r() * 0.1 + data.mocks.length * 0.015))));
      data.mocks.push({ id: `${k.id}-${m.date}`, testId: k.id, mockDate: m.date, subject: subj, date: m.date, points: pts, max: 50, autoPoints: pts - 6, selfPoints: 6, answers: {}, itemPoints: {}, minutesUsed: k.durationMin - 3 });
    }
  }
  const meta = { id, name, emoji, color, soft: '', track, zkk, english };
  return { meta, data };
}

/** Playwright helper: writes the demo profiles into localStorage (global + per-profile keys). */
export async function seedDemo(page, profiles, today) {
  await page.evaluate(({ profiles, today }) => {
    const g = { v: 2, pin: '1234', profiles: profiles.map((p) => p.meta), minutes: Object.fromEntries(profiles.map((p) => [p.meta.id, {}])), lastProfile: profiles[0].meta.id };
    localStorage.setItem('doucovani:v1:global', JSON.stringify(g));
    for (const p of profiles) localStorage.setItem(`doucovani:v1:profile:${p.meta.id}`, JSON.stringify(p.data));
    localStorage.setItem('doucovani:today', today);
  }, { profiles, today });
}
export const DEMO_TODAY = '2026-11-29';
export const demoPair = (today = DEMO_TODAY) => [
  demoProfile({ id: 'demoA', name: 'Ema', emoji: '🦊', color: '#5b6ab0', track: 'g8', zkk: true, today, skill: 0.74, bias: { m5: 0.08, 'c5-pravopis': -0.2, c: -0.04 }, seed: 11 }),
  demoProfile({ id: 'demoB', name: 'Klára', emoji: '🦉', color: '#3f8f86', track: 'g6', english: true, today, skill: 0.7, bias: { c7: 0.1, 'm7-geometrie': -0.22, en7: 0.12, m: -0.05 }, seed: 23, skipRate: 0.14 }),
];
