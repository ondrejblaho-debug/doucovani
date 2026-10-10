// Progress statistics for the parent dashboard.
// Everything is condensed into a compact, self-contained Snapshot so that the same dashboard
// can render on the child's phone (Rodič section) and from a shared link on a parent's phone.
import { ProfileId, profileMeta, student, topic as topicDef, KEYS } from './data';
import { dayPlan, dayStatus, streak, planStart, examDays, daysTo, DayStatus } from './plan';
import type { GlobalData, LessonState, ProfileData } from './store';
import { addDays, fromKey, diffDays } from './dates';

export type Subj = 'matematika' | 'cestina' | 'anglictina' | 'extra';
export const SUBJ_ORDER: Subj[] = ['matematika', 'cestina', 'anglictina', 'extra'];
export const SUBJ_NAME: Record<Subj, string> = { matematika: 'Matematika', cestina: 'Čeština', anglictina: 'Angličtina', extra: 'Křesťanská kultura' };
export const DAYS = 28;
export const WEEKS = 6;

export interface Snap {
  v: 1;
  pid: string; at: number; today: string;
  name: string; emoji: string; color: string; track: 'g8' | 'g6'; en: boolean; zkk: boolean;
  d0: string; // first day of the daily arrays
  min: number[]; // active minutes per day (DAYS)
  pm: number[]; // planned minutes per day (0 = free / no lesson)
  st: string; // status per day: d done, p partial, m missed, f free, k mock planned, x mock done, e exam, t today/planned, n none
  tot: { sec: number; tasks: number; ok: number; days: number };
  wk: [number, number]; // active seconds this week (Mon–today) / last week
  streak: number; missed: number; plan: [number, number]; // planned days so far, done
  subj: Partial<Record<Subj, { n: number; ok: number; sec: number; w: (number | null)[] }>>; // w = weekly accuracy % (oldest → newest)
  top: [string, number, number, number][]; // topic id, attempts, correct, recent accuracy % (EMA)
  mis: [string, string, number, 0 | 1][]; // task id, topic id, times wrong, still in review queue
  mocks: [string, string, 'c' | 'm', number, number][]; // test id, date, subject, points, max
  exam: number; // days to the first exam date
}

const ST_CODE: Record<DayStatus, string> = { done: 'd', partial: 'p', missed: 'm', free: 'f', mock: 'k', 'mock-done': 'x', exam: 'e', planned: 't', today: 't', none: 'n' };

export function subjOfTopic(tid: string): Subj {
  if (tid.startsWith('en7-')) return 'anglictina';
  const s = topicDef(tid)?.subject;
  if (s === 'matematika' || s === 'cestina') return s;
  if (s === 'anglictina') return 'anglictina';
  return 'extra';
}

const lessonsOf = (p: ProfileData) => Object.values(p.lessons) as LessonState[];
/** Active seconds of a lesson per day (falls back to the lesson date for older data). */
function daySecOf(l: LessonState): Record<string, number> {
  if (l.daySec && Object.keys(l.daySec).length) return l.daySec;
  const s = l.cardSec + l.answers.reduce((a, x) => a + x.sec, 0);
  return s ? { [l.date]: s } : {};
}
const mondayOf = (d: string) => addDays(d, -((fromKey(d).getDay() + 6) % 7));

export function buildSnapshot(id: ProfileId, p: ProfileData, g: GlobalData, today: string): Snap {
  const pm = profileMeta(id);
  const st = student(id);
  const d0 = addDays(today, -(DAYS - 1));
  // time per day (lessons + mock tests)
  const perDay: Record<string, number> = {};
  for (const l of lessonsOf(p)) for (const [d, s] of Object.entries(daySecOf(l))) perDay[d] = (perDay[d] || 0) + s;
  for (const m of p.mocks) {
    const k = KEYS.find((x) => x.id === m.testId);
    if (m.minutesUsed) perDay[m.date] = (perDay[m.date] || 0) + 60 * Math.min(m.minutesUsed, (k?.durationMin || 70) + 10);
  }
  const days = Array.from({ length: DAYS }, (_, i) => addDays(d0, i));
  const min = days.map((d) => Math.round((perDay[d] || 0) / 60));
  const pmin = days.map((d) => { const pl = dayPlan(id, d, g); return pl.kind === 'lesson' ? pl.minutes : 0; });
  const stc = days.map((d) => ST_CODE[dayStatus(id, d, today, p, g)]).join('');
  // weeks
  const mon = mondayOf(today);
  const sumRange = (a: string, b: string) => Object.entries(perDay).filter(([d]) => d >= a && d <= b).reduce((s, [, v]) => s + v, 0);
  const wk: [number, number] = [Math.round(sumRange(mon, today)), Math.round(sumRange(addDays(mon, -7), addDays(mon, -1)))];
  // plan adherence since plan start
  let planned = 0, done = 0, missed = 0;
  const start = planStart(id);
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const s = dayStatus(id, d, today, p, g);
    if (d === today && !(s === 'done' || s === 'mock-done')) continue; // today still open
    if (s === 'done' || s === 'mock-done') { done++; planned++; }
    else if (s === 'partial' || s === 'missed' || s === 'mock') { planned++; if (s !== 'partial') missed++; }
  }
  // answers
  const answers = lessonsOf(p).flatMap((l) => l.answers.map((a) => ({ ...a, day: a.day || l.date })));
  const cardSecBySubj: Record<string, number> = {};
  for (const l of lessonsOf(p)) {
    const ct = l.cardTopicSec || (l.cards.length && l.cardSec ? Object.fromEntries(l.cards.map((t) => [t, l.cardSec / l.cards.length])) : {});
    for (const [t, s] of Object.entries(ct)) { const sj = subjOfTopic(t); cardSecBySubj[sj] = (cardSecBySubj[sj] || 0) + s; }
  }
  const subj: Snap['subj'] = {};
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => addDays(mon, -7 * (WEEKS - 1 - i)));
  for (const a of answers) {
    const sj = subjOfTopic(a.topic);
    const o = (subj[sj] ||= { n: 0, ok: 0, sec: 0, w: [] });
    o.n++; if (a.ok) o.ok++; o.sec += a.sec;
  }
  for (const sj of Object.keys(subj) as Subj[]) {
    const o = subj[sj]!;
    o.sec = Math.round(o.sec + (cardSecBySubj[sj] || 0));
    o.w = weekStarts.map((ws) => { const xs = answers.filter((a) => subjOfTopic(a.topic) === sj && a.day >= ws && a.day <= addDays(ws, 6)); return xs.length ? Math.round((100 * xs.filter((a) => a.ok).length) / xs.length) : null; });
  }
  // topics
  const top: Snap['top'] = Object.entries(p.topics).filter(([, s]) => s.seen > 0).map(([t, s]) => [t, s.seen, s.correct, Math.round(s.ema * 100)] as [string, number, number, number]);
  top.sort((a, b) => b[1] - a[1]);
  // most frequent mistakes
  const wrong: Record<string, { topic: string; n: number; last: string }> = {};
  for (const a of answers) if (!a.ok) { const w = (wrong[a.id] ||= { topic: a.topic, n: 0, last: a.day }); w.n++; if (a.day > w.last) w.last = a.day; }
  const mis: Snap['mis'] = Object.entries(wrong).sort((a, b) => b[1].n - a[1].n || (p.srs[b[0]] ? 1 : 0) - (p.srs[a[0]] ? 1 : 0) || b[1].last.localeCompare(a[1].last)).slice(0, 8).map(([tid, w]) => [tid, w.topic, w.n, p.srs[tid] ? 1 : 0]);
  const mocks: Snap['mocks'] = [...p.mocks].sort((a, b) => a.date.localeCompare(b.date)).map((m) => [m.testId, m.date, m.subject === 'cestina' ? 'c' : 'm', m.points, m.max]);
  const activeDays = Object.values(perDay).filter((s) => s >= 60).length;
  return {
    v: 1, pid: id, at: Date.now(), today,
    name: pm.name, emoji: pm.emoji, color: pm.color, track: pm.track, en: !!pm.english, zkk: !!pm.zkk,
    d0, min, pm: pmin, st: stc,
    tot: { sec: Math.round(Object.values(perDay).reduce((a, b) => a + b, 0)), tasks: answers.length, ok: answers.filter((a) => a.ok).length, days: activeDays },
    wk, streak: streak(id, today, p, g), missed, plan: [planned, done],
    subj, top, mis, mocks, exam: Math.max(0, daysTo(today, examDays(id)[0])),
  };
}

/** Topic split for the dashboard: strong ≥ 75 % (at least 3 attempts), the rest with ≥ 3 attempts needs practice. */
export function splitTopics(s: Snap) {
  const rows = s.top.filter((t) => t[1] >= 3).map(([id, n, ok, ema]) => ({ id, n, ok, pct: Math.round((100 * ok) / n), ema }));
  const strong = rows.filter((r) => r.pct >= 75).sort((a, b) => b.pct - a.pct || b.n - a.n);
  const weak = rows.filter((r) => r.pct < 75).sort((a, b) => a.pct - b.pct || b.n - a.n);
  const few = s.top.filter((t) => t[1] < 3).length;
  return { strong, weak, few };
}

export const fmtMin = (sec: number) => { const m = Math.round(sec / 60); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
export const daysBetween = diffDays;
