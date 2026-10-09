// Builds the list of tasks for a lesson from the day plan, the review queue and the bank.
import { ProfileId, student, STATIC_BY_TOPIC, topic as topicDef } from './data';
import { dayPlan, topicsSoFar, Block, DayPlan } from './plan';
import { mulberry32, hashStr, shuffle, Rng } from './rng';
import { candidates, resolveTask } from './tasks';
import type { GlobalData, LessonState, ProfileData, SrsItem } from './store';
import { addDays } from './dates';
import { CARDS } from '../content/cards';

const SEC_PER_TASK = { 5: 80, 7: 75 } as const;

function pickFromTopic(topicId: string, n: number, r: Rng, p: ProfileData, used: Set<string>, salt: number): string[] {
  const c = candidates(topicId);
  const out: string[] = [];
  const seen = (id: string) => p.seen[id] || 0;
  // static + czech word-list items, least seen first
  const pool = shuffle(r, [...c.stat, ...c.cz]).filter((id) => !used.has(id)).sort((a, b) => seen(a) - seen(b));
  // passages: keep tasks of the same passage together
  const statTasks = STATIC_BY_TOPIC[topicId] || [];
  const passageOf: Record<string, string | undefined> = Object.fromEntries(statTasks.map((t) => [t.id, t.passage]));
  const genShare = c.math.length ? (pool.length ? 0.5 : 1) : 0;
  let nGen = Math.round(n * genShare);
  let nPool = n - nGen;
  for (const id of pool) {
    if (out.length >= nPool) break;
    if (out.includes(id)) continue;
    const ps = passageOf[id];
    if (ps) {
      const sib = pool.filter((x) => passageOf[x] === ps && !out.includes(x));
      out.push(...sib.slice(0, Math.max(1, nPool - out.length)));
    } else out.push(id);
  }
  if (out.length < nPool) nGen += nPool - out.length;
  for (let i = 0; i < nGen && c.math.length; i++) {
    const g = c.math[(i + Math.floor(r() * c.math.length)) % c.math.length];
    const seed = (hashStr(`${topicId}:${salt}:${i}`) ^ Math.floor(r() * 1e9)) >>> 0 || 1;
    out.push(`gen:${g}:${seed}`);
  }
  out.forEach((x) => used.add(x));
  return out;
}

function weakest(topics: string[], p: ProfileData, k: number): string[] {
  const scored = topics.map((t) => ({ t, s: p.topics[t] ? p.topics[t].ema : 0.5, seen: p.topics[t]?.seen || 0 }));
  return scored.sort((a, b) => a.s - b.s || a.seen - b.seen).slice(0, k).map((x) => x.t);
}

function blockTasks(b: Block, nTasks: number, r: Rng, p: ProfileData, used: Set<string>, id: ProfileId, date: string, salt: number) {
  let topics = b.topics.filter((t) => candidates(t).stat.length || candidates(t).math.length || candidates(t).cz.length);
  // "-mix" topics: draw from everything covered so far in that subject
  const expanded: string[] = [];
  for (const t of topics) {
    if (t.endsWith('-mix')) {
      const subj = topicDef(t)?.subject as 'matematika' | 'cestina';
      const all = topicsSoFar(id, date, subj).filter((x) => !x.endsWith('-mix') && !x.endsWith('-strategie-testu'));
      expanded.push(...shuffle(r, all).slice(0, 4), t);
    } else expanded.push(t);
  }
  topics = expanded.length ? expanded : topics;
  if (b.warmup) topics = shuffle(r, topics).slice(0, 2);
  if (b.subject === 'review') topics = weakest(topics.filter((t) => !t.endsWith('-strategie-testu')), p, 4);
  if (!topics.length) return [];
  const per = Math.floor(nTasks / topics.length);
  let rest = nTasks - per * topics.length;
  const out: string[] = [];
  topics.forEach((t, i) => { const k = per + (rest-- > 0 ? 1 : 0); if (k > 0) out.push(...pickFromTopic(t, k, r, p, used, salt * 31 + i)); });
  return out;
}

export function dueReviews(p: ProfileData, date: string, subjects?: string[]): SrsItem[] {
  return Object.values(p.srs).filter((s) => s.due <= date && (!subjects || subjects.includes(['skola', 'anglictina'].includes(topicDef(s.topic)?.subject) ? 'extra' : topicDef(s.topic)?.subject))).sort((a, b) => a.due.localeCompare(b.due));
}

export function buildLesson(id: ProfileId, date: string, p: ProfileData, g: GlobalData, kind: 'daily' | 'extra' = 'daily', plan?: DayPlan): LessonState {
  const st = student(id);
  const salt = kind === 'daily' ? 1 : Object.keys(p.lessons).filter((k) => k.startsWith(date + '#')).length + 2;
  const r = mulberry32(hashStr(`${id}|${date}|${kind}|${salt}`));
  let pl = plan || dayPlan(id, date, g);
  if (pl.kind !== 'lesson') {
    // free/before days: optional practice from the current (or first) week
    const w = pl.week || st.weeks.find((x) => x.weekStart > date) || st.weeks[0];
    pl = { ...pl, kind: 'lesson', blocks: [
      { subject: 'matematika', minutes: 6, topics: w.matematika.topics, label: 'Matematika' },
      { subject: 'cestina', minutes: 6, topics: w.cestina.topics, label: 'Čeština' },
    ], minutes: 12 };
  }
  const used = new Set<string>();
  const tasks: LessonState['tasks'] = [];
  const cards: string[] = [];
  const secPer = SEC_PER_TASK[st.grade];
  // reviews first (max 30 % of the lesson, on review days up to 70 %)
  const total = Math.max(4, Math.round((pl.minutes * 60 - 90) / secPer));
  const isReviewDay = pl.blocks.some((b) => b.subject === 'review');
  const due = dueReviews(p, date).filter((s) => resolveTask(s.id));
  const nRev = Math.min(due.length, Math.round(total * (isReviewDay ? 0.7 : 0.3)));
  const reviews = due.slice(0, nRev);
  reviews.forEach((s) => { used.add(s.id); });
  let remaining = total - nRev;
  pl.blocks.forEach((b, bi) => {
    const share = b.minutes / pl.minutes;
    const n = bi === pl.blocks.length - 1 ? remaining : Math.max(b.warmup ? 2 : 3, Math.round((total - nRev) * share));
    remaining -= n;
    const ids = blockTasks(b, Math.max(0, n), r, p, used, id, date, salt * 7 + bi);
    if (!b.warmup && b.subject !== 'review') for (const t of b.topics) if (CARDS[t] && !cards.includes(t) && !t.endsWith('-mix')) cards.push(t);
    for (const x of ids) tasks.push({ id: x, block: b.label });
  });
  // spaced-repetition reviews open the lesson (warm-up with yesterday's mistakes)
  tasks.unshift(...reviews.map((s) => ({ id: s.id, block: 'Opakování chyb', review: true })));
  return { date, kind, tasks: tasks.filter((t) => resolveTask(t.id)), cards: cards.slice(0, 3), idx: 0, answers: [], cardSec: 0, startedAt: Date.now() };
}

/** Records an answer: topic stats, seen counter and the spaced-repetition queue. */
const INTERVALS = [1, 3, 7, 14, 30];
export function recordAnswer(p: ProfileData, taskId: string, topicId: string, ok: boolean, date: string, review: boolean) {
  const ts = (p.topics[topicId] ||= { seen: 0, correct: 0, ema: 0.5, last: date });
  ts.seen++; if (ok) ts.correct++; ts.ema = ts.ema * 0.75 + (ok ? 0.25 : 0); ts.last = date;
  p.seen[taskId] = (p.seen[taskId] || 0) + 1;
  const s = p.srs[taskId];
  if (!ok) {
    p.srs[taskId] = { id: taskId, topic: topicId, box: 0, due: addDays(date, 1), lapses: (s?.lapses || 0) + 1 };
  } else if (s && review) {
    const box = s.box + 1;
    if (box >= INTERVALS.length) delete p.srs[taskId];
    else p.srs[taskId] = { ...s, box, due: addDays(date, INTERVALS[box]) };
  }
}
