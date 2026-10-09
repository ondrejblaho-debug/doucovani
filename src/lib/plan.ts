// Day planning from curriculum.json
import { student, ProfileId, Week, MockDef, PHASES } from './data';
import { addDays, diffDays, fromKey, isSunday, WD } from './dates';
import type { GlobalData, ProfileData } from './store';

export type BlockSubject = 'matematika' | 'cestina' | 'extra' | 'review';
export interface Block { subject: BlockSubject; minutes: number; topics: string[]; label: string; warmup?: boolean }
export type DayKind = 'before' | 'free' | 'lesson' | 'mock' | 'exam' | 'after';
export interface DayPlan { date: string; kind: DayKind; week?: Week; phase?: string; weekday: string; template: string; blocks: Block[]; minutes: number; mock?: MockDef; examLabel?: string; schoolTest?: string }

export const planStart = (id: ProfileId) => student(id).weeks[0].weekStart;
export const examDays = (id: ProfileId) => { const e = student(id).examDates; return [e.jpz1, e.jpz2] as string[]; };
export const weekFor = (id: ProfileId, date: string) => student(id).weeks.find((w) => w.weekStart <= date && date <= w.weekEnd);
export const mockFor = (id: ProfileId, date: string) => student(id).mockTests.find((m) => m.date === date);
/** Assumed school-test days (module tests) for a profile: date → label. */
export function schoolTests(id: ProfileId, g: GlobalData): Record<string, string> {
  const st = student(id); const pr = g.profiles.find((x) => x.id === id);
  const out: Record<string, string> = {};
  if (pr?.english && st.examDates.skolniTestAJ) for (const d of st.examDates.skolniTestAJ as string[]) out[d] = 'test z AJ (předpoklad)';
  if (pr?.zkk && st.examDates.skolniTestZKK) for (const d of st.examDates.skolniTestZKK as string[]) out[d] = 'test z křesťanské kultury (předpoklad)';
  return out;
}
const enTopics = (w: Week) => { const t = w.extra.topics.filter((x) => x.startsWith('en7-')); return t.length ? t : ['en7-anglictina']; };
export const phaseName = (pid: string) => PHASES.find((p) => p.id === pid)?.name || pid;

/** Topics covered up to (and including) a date, per subject – used for warm-ups, mix and review days. */
export function topicsSoFar(id: ProfileId, date: string, subject: 'matematika' | 'cestina'): string[] {
  const out: string[] = [];
  for (const w of student(id).weeks) { if (w.weekStart > date) break; for (const t of w[subject].topics) if (!out.includes(t)) out.push(t); }
  return out;
}

export function dayPlan(id: ProfileId, date: string, g: GlobalData): DayPlan {
  const st = student(id);
  const d = fromKey(date);
  const weekday = WD[d.getDay()];
  const base: DayPlan = { date, kind: 'free', weekday, template: '', blocks: [], minutes: 0 };
  const ex = examDays(id);
  if (ex.includes(date)) return { ...base, kind: 'exam', examLabel: date === ex[0] ? 'Přijímací zkouška – 1. termín' : 'Přijímací zkouška – 2. termín' };
  const mock = mockFor(id, date);
  const week = weekFor(id, date);
  if (date < planStart(id)) return { ...base, kind: 'before', week: st.weeks[0] };
  if (date > ex[1]) return { ...base, kind: 'after' };
  if (mock) return { ...base, kind: 'mock', mock, week, phase: week?.phase };
  if (!week) return { ...base, kind: 'after' };
  const pr = g.profiles.find((x) => x.id === id);
  const tmpl = (st.dailyTemplate[weekday] || []).filter((b) => b.subject !== 'anglictina');
  if (isSunday(date) || !tmpl.length) return { ...base, kind: 'free', week, phase: week.phase };

  const override = g.minutes[id]?.[weekday];
  let minutes = override && override > 0 ? override : tmpl.reduce((s, b) => s + b.minutes, 0);
  // exam week: only a short warm-up before the exam days
  if (date >= addDays(ex[0], -2) && date < ex[0]) minutes = st.grade === 5 ? 10 : 15;
  const schoolTest = schoolTests(id, g)[date];
  if (schoolTest) minutes = Math.min(minutes, 15); // possible school-test day: keep it short

  const subj = tmpl[0].subject;
  const mTopics = [...week.matematika.topics];
  const cTopics = [...week.cestina.topics];
  if (week.extra.topics.includes('mo-z5') && (subj === 'matematika' || subj === 'mix')) mTopics.push('mo-z5');
  const blocks: Block[] = [];
  const warm = Math.min(4, Math.round(minutes * 0.15));
  const prevM = topicsSoFar(id, addDays(week.weekStart, -1), 'matematika');
  const prevC = topicsSoFar(id, addDays(week.weekStart, -1), 'cestina');
  if (subj === 'matematika') {
    blocks.push({ subject: 'matematika', minutes: minutes - warm, topics: mTopics, label: 'Matematika' });
    blocks.push({ subject: 'cestina', minutes: warm, topics: prevC.length ? prevC : cTopics, label: 'Čeština – rozcvička', warmup: true });
  } else if (subj === 'cestina') {
    blocks.push({ subject: 'cestina', minutes: minutes - warm, topics: cTopics, label: 'Čeština' });
    blocks.push({ subject: 'matematika', minutes: warm, topics: prevM.length ? prevM : mTopics, label: 'Matematika – rozcvička', warmup: true });
  } else if (subj === 'mix') {
    const half = Math.round(minutes / 2);
    blocks.push({ subject: 'matematika', minutes: half, topics: mTopics, label: 'Matematika' });
    blocks.push({ subject: 'cestina', minutes: minutes - half, topics: cTopics, label: 'Čeština' });
  } else {
    // opakovani – review queue + weakest topics so far
    blocks.push({ subject: 'review', minutes, topics: [...topicsSoFar(id, date, 'matematika'), ...topicsSoFar(id, date, 'cestina')], label: 'Opakování' });
  }
  // 8-year track – optional module: basics of Christian culture (school test)
  const zkkEnd = (st.examDates.skolniTestZKK as string[] | undefined)?.slice(-1)[0] || ex[0];
  if (st.id === 'g8' && pr?.zkk && date >= '2027-01-04' && date <= zkkEnd) {
    const days = date >= '2027-03-08' ? ['Út', 'Pá', 'So'] : ['Pá', 'So'];
    if (days.includes(weekday) || schoolTest) blocks.push({ subject: 'extra', minutes: schoolTest ? 10 : 15, topics: ['zkk-krestanska-kultura'], label: schoolTest ? 'Křesťanská kultura – rozcvička před testem' : 'Křesťanská kultura' });
  }
  // 6-year track – English module (on by default): Út/Pá +10, more in Ostrý trénink until the school English test
  const ep = st.englishPlan;
  if (st.id === 'g6' && pr?.english && ep && date <= ep.until) {
    const m = (date >= ep.ostryFrom ? ep.ostry : ep.regular)[weekday];
    if (schoolTest) blocks.push({ subject: 'extra', minutes: 10, topics: enTopics(week), label: 'Angličtina – rozcvička před testem' });
    else if (m) blocks.push({ subject: 'extra', minutes: m, topics: enTopics(week), label: 'Angličtina' });
  }
  return { ...base, kind: 'lesson', week, phase: week.phase, template: subj, blocks, minutes: blocks.reduce((s, b) => s + b.minutes, 0), schoolTest };
}

export type DayStatus = 'done' | 'partial' | 'missed' | 'free' | 'mock' | 'mock-done' | 'exam' | 'planned' | 'today' | 'none';

export function dayStatus(id: ProfileId, date: string, today: string, p: ProfileData, g: GlobalData): DayStatus {
  const plan = dayPlan(id, date, g);
  const l = p.lessons[date];
  if (plan.kind === 'exam') return 'exam';
  if (plan.kind === 'mock') return p.mocks.some((m) => m.mockDate === date) ? 'mock-done' : 'mock';
  if (plan.kind === 'before' || plan.kind === 'after') return l?.finishedAt ? 'done' : 'none';
  if (plan.kind === 'free') return l?.finishedAt ? 'done' : 'free';
  if (l?.finishedAt) return 'done';
  if (l && l.answers.length) return date < today ? 'partial' : 'partial';
  if (date < today) return 'missed';
  if (date === today) return 'today';
  return 'planned';
}

/** Consecutive successful days ending today (or yesterday if today not finished yet); free days don't break it. */
export function streak(id: ProfileId, today: string, p: ProfileData, g: GlobalData): number {
  let n = 0;
  let d = today;
  const st0 = dayStatus(id, d, today, p, g);
  if (!(st0 === 'done' || st0 === 'mock-done')) d = addDays(d, -1);
  for (let i = 0; i < 400; i++) {
    const s = dayStatus(id, d, today, p, g);
    if (s === 'done' || s === 'mock-done') n++;
    else if (s === 'free' || s === 'exam') { /* neutral */ }
    else if (s === 'none') break;
    else break;
    d = addDays(d, -1);
  }
  return n;
}

export const daysTo = (from: string, to: string) => diffDays(from, to);
