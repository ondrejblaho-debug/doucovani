// Scoring of official CERMAT tests against the encoded keys.
import type { KeyItem, KeyPart, TestKey } from './data';
import { parseNum } from './num';

export type Answers = Record<string, string | string[]>;
export type SelfPts = Record<string, number>;
export interface ItemScore { n: string; max: number; auto: number | null; self: boolean; points: number; suggestion?: number }

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,;]+$/, '');
const firstNum = (s: string) => { const m = s.replace(/\u00a0/g, ' ').match(/^[^\d−-]*([−-]?\d[\d ]*(?:[,.]\d+)?)/); return m ? parseNum(m[1].replace(/ /g, '')) : NaN; };

/** An open part can be auto-scored only when the key is a plain number (with optional unit) in a math test. */
export function autoOpen(subject: string, ans: string | null | undefined): boolean {
  if (!ans || subject !== 'matematika') return false;
  if (/např|nebo|;|postup|viz|zakresl/i.test(ans)) return false;
  return /^(o |za |v )?[−-]?\d[\d ]*([,.]\d+)?\.?( ?[a-zA-Zá-žÁ-Ž²³%]+){0,3}$/.test(ans.trim()) && !isNaN(firstNum(ans));
}
function openMatches(key: string, given: string): boolean {
  if (!given?.trim()) return false;
  const a = firstNum(key), b = firstNum(given);
  if (!isNaN(a) && !isNaN(b)) return Math.abs(a - b) < 1e-9;
  return norm(key) === norm(given);
}
const partOk = (p: KeyPart, g: unknown) => {
  if (g === undefined || g === null || g === '') return false;
  if (p.type === 'open') return openMatches(String(p.answer ?? ''), String(g));
  return String(g).toUpperCase() === String(p.answer).toUpperCase();
};

export function isSelfItem(k: TestKey, it: KeyItem): boolean {
  if (it.selfItem || it.constr) return true;
  if (it.type === 'open') return true;
  if (it.type === 'parts') return it.parts!.some((p) => p.pts == null || (p.type === 'open' && !autoOpen(k.subject, p.answer)));
  return false;
}

export function scoreItem(k: TestKey, it: KeyItem, a: Answers, self: SelfPts): ItemScore {
  const n = it.n;
  const base = { n, max: it.max };
  if (it.type === 'choice') { const pts = String(a[n] || '').toUpperCase() === String(it.answer) ? it.max : 0; return { ...base, auto: pts, self: false, points: pts }; }
  if (it.type === 'order') {
    const g = (a[n] as string[]) || []; const ok = (it.answer as string[]).every((x, i) => (g[i] || '').toUpperCase() === x);
    return { ...base, auto: ok ? it.max : 0, self: false, points: ok ? it.max : 0 };
  }
  if (it.type === 'group') {
    const c = it.parts!.filter((p) => partOk(p, a[p.n])).length; const pts = it.grp?.[String(c)] ?? 0;
    return { ...base, auto: pts, self: false, points: pts };
  }
  if (it.type === 'parts') {
    const sug = it.parts!.reduce((s, p) => s + (partOk(p, a[p.n]) ? p.pts || 0 : 0), 0);
    if (isSelfItem(k, it)) {
      // part-level self scoring when parts carry points, else item-level
      if (it.parts!.every((p) => p.pts != null) && !it.selfItem) {
        let pts = 0;
        for (const p of it.parts!) pts += p.type === 'open' && !autoOpen(k.subject, p.answer) ? Math.min(p.pts!, self[p.n] ?? 0) : partOk(p, a[p.n]) ? p.pts! : 0;
        return { ...base, auto: null, self: true, points: Math.min(it.max, pts), suggestion: Math.min(it.max, sug) };
      }
      return { ...base, auto: null, self: true, points: Math.min(it.max, self[n] ?? 0), suggestion: Math.min(it.max, sug) };
    }
    return { ...base, auto: Math.min(it.max, sug), self: false, points: Math.min(it.max, sug) };
  }
  // open
  const sug = it.answer && openMatches(String(it.answer), String(a[n] || '')) ? it.max : undefined;
  return { ...base, auto: null, self: true, points: Math.min(it.max, self[n] ?? 0), suggestion: sug };
}

export function scoreTest(k: TestKey, a: Answers, self: SelfPts) {
  const items = k.items.map((it) => scoreItem(k, it, a, self));
  const points = items.reduce((s, i) => s + i.points, 0);
  const autoPoints = items.filter((i) => !i.self).reduce((s, i) => s + i.points, 0);
  return { items, points, autoPoints, selfPoints: points - autoPoints, max: k.maxPoints };
}
