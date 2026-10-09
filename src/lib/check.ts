import type { Task } from './types';
import { normalizeAnswer, parseNum } from './num';

export type Response = number | boolean | string | boolean[] | string[] | null;

const normText = (s: string, cs?: boolean) => {
  let t = s.trim().replace(/\s+/g, ' ').replace(/[.!]$/, '').replace(/[„“"]/g, '').replace(/[’‘`´]/g, "'");
  return cs ? t : t.toLowerCase();
};

export function checkAnswer(t: Task, r: Response): boolean {
  if (r === null || r === undefined) return false;
  switch (t.kind) {
    case 'mc':
    case 'gap':
      return r === t.correct;
    case 'yn':
      return r === t.answer;
    case 'yng':
      return Array.isArray(r) && t.statements!.every((s, i) => (r as boolean[])[i] === s.a);
    case 'num': {
      const s = String(r);
      if (t.strict) return t.answers!.some((a) => normalizeAnswer(a) === normalizeAnswer(s));
      const v = parseNum(s);
      return t.answers!.some((a) => {
        const av = parseNum(a);
        if (isNaN(av) || isNaN(v)) return normalizeAnswer(a) === normalizeAnswer(s);
        return Math.abs(av - v) <= 1e-9 * Math.max(1, Math.abs(av));
      });
    }
    case 'text':
      return t.answers!.some((a) => normText(a, t.caseSensitive) === normText(String(r), t.caseSensitive));
    case 'match':
      return Array.isArray(r) && t.pairs!.every((p, i) => (r as string[])[i] === p[1]);
    case 'order':
      return Array.isArray(r) && t.items!.length === r.length && t.items!.every((it, i) => (r as string[])[i] === it);
  }
  return false;
}

export function correctAnswerText(t: Task): string {
  switch (t.kind) {
    case 'mc': return t.options![t.correct!];
    case 'gap': return (t.gapText![0] + t.options![t.correct!] + t.gapText![1]).trim();
    case 'yn': return t.answer ? 'ANO' : 'NE';
    case 'yng': return t.statements!.map((s) => (s.a ? 'ANO' : 'NE')).join(', ');
    case 'num': return t.answers![0] + unitSuffix(t.unit);
    case 'text': return t.answers![0];
    case 'match': return t.pairs!.map((p) => `${p[0]} → ${p[1]}`).join('; ');
    case 'order': return t.items!.join(' → ');
  }
}

export const unitSuffix = (u?: string) => (!u ? '' : u.startsWith('°') && u.length === 1 ? u : '\u00a0' + u);
