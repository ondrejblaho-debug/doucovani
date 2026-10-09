// Compiles the authoring DSL in bank/*.txt into src/generated/bank.json
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Task, Passage, Kind } from '../src/lib/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export interface CompileResult { tasks: Task[]; passages: Record<string, Passage>; errors: string[] }

function topicMeta(topic: string): { subject: Task['subject']; grade: 5 | 7 } {
  if (topic.startsWith('c5-')) return { subject: 'cestina', grade: 5 };
  if (topic.startsWith('c7-')) return { subject: 'cestina', grade: 7 };
  if (topic.startsWith('m5-') || topic === 'mo-z5') return { subject: 'matematika', grade: 5 };
  if (topic.startsWith('m7-')) return { subject: 'matematika', grade: 7 };
  if (topic.startsWith('en7-')) return { subject: 'extra', grade: 7 };
  if (topic === 'zkk-krestanska-kultura') return { subject: 'extra', grade: 5 };
  throw new Error('Unknown topic prefix ' + topic);
}

export function compile(): CompileResult {
  const dir = join(root, 'bank');
  const files = readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  const tasks: Task[] = [];
  const passages: Record<string, Passage> = {};
  const errors: string[] = [];
  const counters: Record<string, number> = {};
  for (const f of files) {
    const lines = readFileSync(join(dir, f), 'utf8').split('\n');
    let topic = '';
    let diff: 1 | 2 | 3 = 1;
    let defExpl = '';
    let gapPrompt = 'Doplň správně.';
    let inPassage: Passage | null = null;
    lines.forEach((raw, idx) => {
      const where = `${f}:${idx + 1}`;
      const line = raw.replace(/\s+$/, '');
      if (inPassage) {
        if (line.trim() === '@end') { inPassage.text = inPassage.text.trim(); passages[inPassage.id] = inPassage; inPassage = null; }
        else inPassage.text += line + '\n';
        return;
      }
      if (!line.trim() || line.trim().startsWith('#')) return;
      if (line.startsWith('@topic ')) { topic = line.slice(7).trim(); diff = 1; defExpl = ''; gapPrompt = 'Doplň správně.'; return; }
      if (line.startsWith('@diff ')) { diff = Number(line.slice(6).trim()) as 1 | 2 | 3; return; }
      if (line.startsWith('@defexpl ')) { defExpl = line.slice(9).trim(); return; }
      if (line.startsWith('@gapprompt ')) { gapPrompt = line.slice(11).trim(); return; }
      if (line.startsWith('@passage ') || line.startsWith('@listen ')) {
        const m = line.match(/^@(?:passage|listen)\s+(\S+)\s*(.*)$/);
        if (!m) { errors.push(where + ' bad passage'); return; }
        if (passages[m[1]]) errors.push(where + ' duplicate passage ' + m[1]);
        inPassage = { id: m[1], title: m[2] || '', text: '', ...(line.startsWith('@listen ') ? { audio: true } : {}) };
        return;
      }
      if (!topic) { errors.push(where + ' task before @topic'); return; }
      const parts = line.split(' | ').map((s) => s.trim());
      let head = parts[0];
      let d = diff;
      const dm = head.match(/\[(\d)\]/);
      if (dm) { d = Number(dm[1]) as 1 | 2 | 3; head = head.replace(/\s*\[\d\]\s*/, ''); }
      let passage: string | undefined;
      const pm = head.match(/^(\w+)@(\S+)$/);
      if (pm) { head = pm[1]; passage = pm[2]; }
      const kind = head as Kind;
      let meta;
      try { meta = topicMeta(topic); } catch (e) { errors.push(where + ' ' + (e as Error).message); return; }
      counters[topic] = (counters[topic] || 0) + 1;
      const t: Task = { id: `${topic}#${counters[topic]}`, topic, ...meta, kind, prompt: '', explain: '', diff: d };
      if (passage) t.passage = passage;
      const nl = (s: string) => s.replace(/\\n/g, '\n');
      try {
        switch (kind) {
          case 'mc': {
            const [, prompt, opts, expl] = parts;
            t.prompt = nl(prompt);
            const o = opts.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean);
            const ci = o.findIndex((s) => s.startsWith('*'));
            if (o.filter((s) => s.startsWith('*')).length !== 1) throw new Error('mc needs exactly one *');
            t.options = o.map((s) => s.replace(/^\*/, '').trim());
            t.correct = ci;
            t.explain = expl || defExpl;
            break;
          }
          case 'yn': {
            const [, prompt, ans, expl] = parts;
            t.prompt = nl(prompt);
            if (ans !== 'ano' && ans !== 'ne') throw new Error('yn answer must be ano/ne');
            t.answer = ans === 'ano';
            t.explain = expl || defExpl;
            break;
          }
          case 'yng': {
            const [, prompt, sts, expl] = parts;
            t.prompt = nl(prompt);
            t.statements = sts.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean).map((s) => {
              const m = s.match(/^(.*)=([AN])$/);
              if (!m) throw new Error('yng statement must end with =A or =N: ' + s);
              return { s: m[1].trim(), a: m[2] === 'A' };
            });
            t.explain = expl || defExpl;
            break;
          }
          case 'gap': {
            let prompt = gapPrompt, body: string, expl: string | undefined;
            if (parts.length >= 3 && parts[1].includes('{') === false) { prompt = parts[1]; body = parts[2]; expl = parts[3]; }
            else { body = parts[1]; expl = parts[2]; }
            const m = body.match(/^(.*?)\{([^}]+)\}(.*)$/s);
            if (!m) throw new Error('gap needs {a|b}');
            if (/\{/.test(m[3])) throw new Error('only one gap allowed');
            const o = m[2].split('|').map((s) => s.trim());
            t.prompt = nl(prompt);
            t.gapText = [nl(m[1]), nl(m[3])];
            // deterministic shuffle so the correct option is not always first
            let h = 2166136261; for (const ch of t.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
            const idx = o.map((_, i) => i);
            for (let i = idx.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
            t.options = idx.map((i) => o[i]); t.correct = idx.indexOf(0);
            const full = (m[1] + o[0] + m[3]).trim();
            if (expl && expl.startsWith('=')) {
              const w = expl.slice(1).trim();
              t.explain = `${full} – příbuzné s vyjmenovaným slovem „${w}“, proto ${/[yý]/.test(o[0]) ? 'tvrdé y/ý' : o[0]}.`;
            } else if (expl === '-' || (!expl && defExpl === '-')) {
              t.explain = `${full} – není to vyjmenované ani příbuzné slovo, proto píšeme měkké ${o[0]}.`;
            } else t.explain = (expl || defExpl).replace('%', full);
            break;
          }
          case 'num':
          case 'text': {
            const [, prompt, ans, expl, unit] = parts;
            t.prompt = nl(prompt);
            t.answers = ans.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean);
            t.explain = expl || defExpl;
            if (unit) t.unit = unit;
            if (kind === 'text' && head === 'text' && /!$/.test(parts[0])) t.caseSensitive = true;
            break;
          }
          case 'match': {
            const [, prompt, prs, expl] = parts;
            t.prompt = nl(prompt);
            t.pairs = prs.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean).map((s) => {
              const [a, b] = s.split('=>').map((x) => x.trim());
              if (!a || !b) throw new Error('match pair needs =>: ' + s);
              return [a, b] as [string, string];
            });
            t.explain = expl || defExpl;
            break;
          }
          case 'order': {
            const [, prompt, its, expl] = parts;
            t.prompt = nl(prompt);
            t.items = its.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean);
            t.explain = expl || defExpl;
            break;
          }
          default:
            if ((head as string) === 'textc') {
              const [, prompt, ans, expl] = parts;
              t.kind = 'text'; t.caseSensitive = true; t.prompt = nl(prompt);
              t.answers = ans.split(/(?<!\\);/).map((x) => x.replace(/\\;/g, ';')).map((s) => s.trim()).filter(Boolean);
              t.explain = expl || defExpl;
              break;
            }
            throw new Error('unknown kind ' + head);
        }
      } catch (e) {
        errors.push(where + ' ' + (e as Error).message);
        return;
      }
      tasks.push(t);
    });
    if (inPassage) errors.push(f + ' unterminated passage');
  }
  return { tasks, passages, errors };
}

if (process.argv[1] && process.argv[1].endsWith('compile-bank.ts')) {
  const r = compile();
  if (r.errors.length) { console.error(r.errors.join('\n')); process.exit(1); }
  mkdirSync(join(root, 'src/generated'), { recursive: true });
  writeFileSync(join(root, 'src/generated/bank.json'), JSON.stringify({ tasks: r.tasks, passages: r.passages }));
  console.log('compiled', r.tasks.length, 'tasks,', Object.keys(r.passages).length, 'passages');
}
