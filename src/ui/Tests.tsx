import { useState } from 'preact/hooks';
import { Icon } from './icons';
import { ProfileId, profileMeta, student, findKey, KEYS, TestKey, KeyItem, MockDef } from '../lib/data';
import { scoreTest, isSelfItem, autoOpen, Answers, SelfPts } from '../lib/mock';
import { updateProfile, MockResult } from '../lib/store';
import { fmtFull, fmtShort, today as todayKey } from '../lib/dates';
import { useStore, useNow, useFocusMode, ActionBar } from './common';

type View = { k: 'list' } | { k: 'run'; testId: string; mockDate?: string } | { k: 'result'; rid: string };
const SUBJ = { cestina: 'Český jazyk a literatura', matematika: 'Matematika' } as const;

export function Tests({ id }: { id: ProfileId }) {
  const [v, setV] = useState<View>({ k: 'list' });
  if (v.k === 'run') return <RunTest id={id} testId={v.testId} mockDate={v.mockDate} back={() => setV({ k: 'list' })} done={(rid) => setV({ k: 'result', rid })} />;
  if (v.k === 'result') return <Result id={id} rid={v.rid} back={() => setV({ k: 'list' })} />;
  return <TestList id={id} open={(testId, mockDate) => setV({ k: 'run', testId, mockDate })} openResult={(rid) => setV({ k: 'result', rid })} />;
}

function TestList({ id, open, openResult }: { id: ProfileId; open: (t: string, d?: string) => void; openResult: (r: string) => void }) {
  const { p } = useStore(id);
  const st = student(id);
  const t = todayKey();
  const meta = profileMeta(id);
  const scheduled = st.mockTests;
  const next = scheduled.find((m) => m.date >= t);
  const archive = KEYS.filter((k) => k.grade === st.grade).sort((a, b) => b.year - a.year || a.termCode.localeCompare(b.termCode) || a.subject.localeCompare(b.subject));
  return (
    <div class="screen">
      <div class="card">
        <h2>Testy nanečisto</h2>
        <p class="small">Oficiální testy CERMAT (JPZ {st.grade === 5 ? '8letá' : '6letá'} gymnázia). Test vytiskni nebo otevři, spusť časovač, řeš na papír a pak zapiš odpovědi – aplikace je vyhodnotí podle klíče.</p>
        <Trend results={p!.mocks} />
      </div>
      {scheduled.map((m) => <MockCard id={id} m={m} isNext={m === next} open={open} openResult={openResult} />)}
      <details class="card">
        <summary><b>Archiv – všechny zakódované testy ({archive.length})</b></summary>
        <ul class="plain">{archive.map((k) => {
          const rs = p!.mocks.filter((r) => r.testId === k.id);
          return <li><button class="link" onClick={() => open(k.id)}>{k.year} · {k.term} · {SUBJ[k.subject]}</button>{rs.length > 0 && <small> – naposledy {rs[rs.length - 1].points}/{rs[rs.length - 1].max} b.</small>}</li>;
        })}</ul>
      </details>
    </div>
  );
}

function MockCard({ id, m, isNext, open, openResult }: { id: ProfileId; m: MockDef; isNext: boolean; open: (t: string, d?: string) => void; openResult: (r: string) => void }) {
  const { p } = useStore(id);
  const st = student(id);
  return (
    <div class={'card mockcard' + (isNext ? ' next' : '')}>
      <div class="mhead"><b>{fmtShort(m.date)}</b><span>{m.label}</span>{isNext && <span class="pill">další</span>}</div>
      <small>JPZ {m.testYear}, {m.testTerm}</small>
      <div class="two">{(['cestina', 'matematika'] as const).map((s) => {
        const k = findKey(st.grade, s, m.testYear, m.testTerm);
        const r = p!.mocks.filter((x) => k && x.testId === k.id && x.mockDate === m.date).pop();
        return (
          <div class="sub">
            <b>{s === 'cestina' ? 'ČJL' : 'MA'}</b> <small>{m.durations[s]} min</small>
            {!k && <p class="small warn">Klíč nenalezen – vyhodnoť ručně podle PDF.</p>}
            {r ? <button class="secondary" onClick={() => openResult(r.id)}>{r.points}/{r.max} b.</button> : k && <button class="primary" onClick={() => open(k.id, m.date)}>Spustit</button>}
          </div>
        );
      })}</div>
    </div>
  );
}

export function Trend({ results }: { results: MockResult[] }) {
  const color = 'var(--accent)', c2 = 'var(--text2)';
  if (!results.length) return <p class="small muted">Zatím žádné výsledky – graf se ukáže po prvním testu.</p>;
  const W = 320, H = 150, P = 28;
  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const xs = sorted.map((_, i) => P + (sorted.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (sorted.length - 1)));
  const y = (v: number, max: number) => H - P - (v / max) * (H - 2 * P);
  const line = (subj: string) => sorted.map((r, i) => (r.subject === subj ? `${xs[i]},${y(r.points, r.max)}` : null)).filter(Boolean).join(' ');
  return (
    <svg class="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vývoj bodů v testech">
      {[0, 25, 50].map((v) => <g><line x1={P} x2={W - P / 2} y1={y(v, 50)} y2={y(v, 50)} stroke="var(--line)" /><text x={4} y={y(v, 50) + 4} font-size="10" fill="var(--text3)">{v}</text></g>)}
      <polyline points={line('cestina')} fill="none" stroke={color} stroke-width="2.5" />
      <polyline points={line('matematika')} fill="none" stroke={c2} stroke-width="2" stroke-dasharray="5 3" />
      {sorted.map((r, i) => <circle cx={xs[i]} cy={y(r.points, r.max)} r="4" fill={r.subject === 'cestina' ? color : c2}><title>{`${r.testId}: ${r.points}/${r.max}`}</title></circle>)}
      <text x={P} y={H - 6} font-size="10" fill={color}>— ČJL</text><text x={P + 50} y={H - 6} font-size="10" fill={c2}>- - MA</text>
    </svg>
  );
}

function Timer({ id, k }: { id: ProfileId; k: TestKey }) {
  const { p } = useStore(id);
  const now = useNow(1000);
  const t = p!.timers[k.id];
  if (!t) return <button class="primary big" onClick={() => updateProfile(id, (d) => { d.timers[k.id] = { start: Date.now(), minutes: k.durationMin }; })}>Spustit časovač ({k.durationMin} min)</button>;
  const left = Math.max(0, t.start + t.minutes * 60000 - now);
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  if (left === 0 && navigator.vibrate) navigator.vibrate(200);
  return (
    <div class={'timer' + (left === 0 ? ' over' : left < 5 * 60000 ? ' soon' : '')}>
      <div class="clock" role="timer">{left === 0 ? 'Čas vypršel!' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`}</div>
      <button class="link" onClick={() => updateProfile(id, (d) => { delete d.timers[k.id]; })}>zrušit časovač</button>
    </div>
  );
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function RunTest({ id, testId, mockDate, back, done }: { id: ProfileId; testId: string; mockDate?: string; back: () => void; done: (rid: string) => void }) {
  const { p } = useStore(id);
  const k = KEYS.find((x) => x.id === testId)!;
  const draft = (p!.drafts[testId] || {}) as { answers?: Answers; self?: SelfPts; phase?: string };
  const answers = draft.answers || {};
  const self = draft.self || {};
  const phase = draft.phase || 'entry';
  const save = (patch: Partial<typeof draft>) => updateProfile(id, (d) => { d.drafts[testId] = { ...(d.drafts[testId] || {}), ...patch } as any; });
  const setA = (n: string, v: string | string[]) => save({ answers: { ...answers, [n]: v } });
  const setS = (n: string, v: number) => save({ self: { ...self, [n]: v } });
  const sc = scoreTest(k, answers, self);
  useFocusMode(true);

  const finish = () => {
    const rid = `${testId}-${Date.now()}`;
    const t = p!.timers[testId];
    updateProfile(id, (d) => {
      d.mocks.push({ id: rid, testId, mockDate, subject: k.subject, date: todayKey(), points: sc.points, max: sc.max, autoPoints: sc.autoPoints, selfPoints: sc.selfPoints, answers, itemPoints: Object.fromEntries(sc.items.map((i) => [i.n, i.points])), minutesUsed: t ? Math.round((Date.now() - t.start) / 60000) : undefined });
      delete d.drafts[testId]; delete d.timers[testId];
    });
    done(rid);
  };

  return (
    <div class="screen runner">
      <div class="topbar"><button class="icon" aria-label="Zpět" onClick={back}><Icon name="chevL" /></button><b>{SUBJ[k.subject]} · JPZ {k.year}, {k.term}</b></div>
      <div class="card">
        <div class="links">
          <a class="secondary" href={k.tsUrl} target="_blank" rel="noopener"><Icon name="file" size={18} /> Testový sešit (PDF)</a>
          <a class="link" href={k.ksrUrl} target="_blank" rel="noopener"><Icon name="key" size={16} /> Klíč (pro rodiče)</a>
        </div>
        <Timer id={id} k={k} />
        <p class="small">Řeš na papír. Po skončení zapiš odpovědi níže (stačí písmena / čísla jako v záznamovém archu). {k.keySource.includes('ruční') ? 'Klíč tohoto testu byl ručně přepsán z obrázku.' : ''}</p>
      </div>
      {phase === 'entry' && (<>
        {k.items.map((it) => <ItemEntry k={k} it={it} a={answers} setA={setA} />)}
        <ActionBar><button class="primary big" onClick={() => save({ phase: 'score' })}>Hotovo – vyhodnotit</button></ActionBar>
      </>)}
      {phase === 'score' && (<>
        <div class="card"><h3>Vyhodnocení</h3><p>Automaticky: <b>{sc.autoPoints} b.</b> · Ručně (rodič): <b>{sc.selfPoints} b.</b> · Celkem <b>{sc.points} / {sc.max}</b></p>
          <p class="small">U otevřených úloh porovnej odpověď s klíčem a vyber počet bodů. Návrh aplikace je předvyplněný tečkou •.</p></div>
        {k.items.map((it) => <ItemScore k={k} it={it} a={answers} self={self} setS={setS} score={sc.items.find((x) => x.n === it.n)!} />)}
        <ActionBar><div class="row2"><button class="secondary" onClick={() => save({ phase: 'entry' })}>Upravit odpovědi</button><button class="primary" onClick={finish}>Uložit výsledek</button></div></ActionBar>
      </>)}
    </div>
  );
}

function Choice({ v, set, opts = LETTERS }: { v?: string; set: (x: string) => void; opts?: string[] }) {
  return <div class="chips">{opts.map((l) => <button class={'chip' + (v === l ? ' on' : '')} onClick={() => set(v === l ? '' : l)}>{l}</button>)}</div>;
}
function PartEntry({ k, part, a, setA }: { k: TestKey; part: { n: string; type: string }; a: Answers; setA: (n: string, v: string) => void }) {
  return (
    <div class="part"><span class="pn">{part.n}</span>
      {part.type === 'choice' && <Choice v={a[part.n] as string} set={(x) => setA(part.n, x)} />}
      {part.type === 'yn' && <Choice v={a[part.n] as string} set={(x) => setA(part.n, x)} opts={['A', 'N']} />}
      {part.type === 'open' && <input class="answer sm" value={(a[part.n] as string) || ''} inputMode={k.subject === 'matematika' ? 'decimal' : 'text'} onInput={(e) => setA(part.n, (e.target as HTMLInputElement).value)} placeholder="odpověď" />}
    </div>
  );
}
function ItemEntry({ k, it, a, setA }: { k: TestKey; it: KeyItem; a: Answers; setA: (n: string, v: string | string[]) => void }) {
  return (
    <div class="card item" data-n={it.n}>
      <div class="ih"><b>Úloha {it.n}</b><small>max. {it.max} b.</small></div>
      {it.type === 'choice' && <Choice v={a[it.n] as string} set={(x) => setA(it.n, x)} />}
      {(it.type === 'group' || it.type === 'parts') && it.parts!.map((pt) => <PartEntry k={k} part={pt} a={a} setA={setA as any} />)}
      {it.type === 'order' && (
        <div class="orderin">{(it.answer as string[]).map((_, i) => {
          const cur = ((a[it.n] as string[]) || []).slice();
          return <label>{i + 1}. část <select value={cur[i] || ''} onChange={(e) => { cur[i] = (e.target as HTMLSelectElement).value; setA(it.n, cur); }}><option value="">–</option>{LETTERS.slice(0, (it.answer as string[]).length).map((l) => <option>{l}</option>)}</select></label>;
        })}</div>
      )}
      {it.type === 'open' && (it.constr ? <p class="small">Konstrukční úloha – ohodnotí rodič podle klíče.</p> : <textarea class="answer" rows={2} value={(a[it.n] as string) || ''} onInput={(e) => setA(it.n, (e.target as HTMLTextAreaElement).value)} placeholder="odpověď / výsledek" />)}
    </div>
  );
}
function Pts({ max, v, sug, set }: { max: number; v?: number; sug?: number; set: (n: number) => void }) {
  return <div class="chips">{Array.from({ length: max + 1 }, (_, i) => <button class={'chip' + (v === i ? ' on' : '')} onClick={() => set(i)}>{i}{sug === i ? '•' : ''}</button>)}</div>;
}
function ItemScore({ k, it, a, self, setS, score }: { k: TestKey; it: KeyItem; a: Answers; self: SelfPts; setS: (n: string, v: number) => void; score: { points: number; max: number; self: boolean; suggestion?: number } }) {
  const given = (n: string) => { const x = a[n]; return Array.isArray(x) ? x.join(' ') : x || '—'; };
  const keyOf = (ans: unknown) => (Array.isArray(ans) ? ans.join(' ') : ans ?? '(viz klíč)');
  const partLevel = it.type === 'parts' && score.self && it.parts!.every((p) => p.pts != null) && !it.selfItem;
  return (
    <div class={'card item ' + (score.self ? 'selfi' : score.points === score.max ? 'full' : score.points ? 'half' : 'zero')}>
      <div class="ih"><b>Úloha {it.n}</b><small>{score.points} / {it.max} b.{score.self ? ' · ručně' : ''}</small></div>
      {it.parts ? it.parts.map((pt) => (
        <div class="kv"><span>{pt.n}</span><span>tvoje: <b>{given(pt.n)}</b></span><span>klíč: <b>{keyOf(pt.answer)}</b>{pt.pts ? ` (${pt.pts} b.)` : ''}</span>
          {partLevel && pt.type === 'open' && !autoOpen(k.subject, pt.answer) && <Pts max={pt.pts!} v={self[pt.n]} set={(x) => setS(pt.n, x)} />}
        </div>
      )) : <div class="kv"><span>tvoje: <b>{given(it.n)}</b></span><span>klíč: <b>{keyOf(it.answer)}</b></span></div>}
      {score.self && !partLevel && <Pts max={it.max} v={self[it.n]} sug={score.suggestion} set={(x) => setS(it.n, x)} />}
      {it.keyText && score.self && <details><summary>Pravidla bodování z klíče</summary><pre class="keytext">{it.keyText}</pre></details>}
    </div>
  );
}

function Result({ id, rid, back }: { id: ProfileId; rid: string; back: () => void }) {
  const { p } = useStore(id);
  const r = p!.mocks.find((x) => x.id === rid);
  if (!r) return <div class="screen"><button onClick={back}>Zpět</button></div>;
  const k = KEYS.find((x) => x.id === r.testId)!;
  const meta = profileMeta(id);
  return (
    <div class="screen">
      <div class="topbar"><button class="icon" aria-label="Zpět" onClick={back}><Icon name="chevL" /></button><b>Výsledek testu</b></div>
      <div class="card center">
        <h2>{SUBJ[r.subject]}</h2><p>JPZ {k.year}, {k.term} · {fmtFull(r.date)}</p>
        <div class="bigscore">{r.points}<small> / {r.max} b.</small></div>
        <p class="small">automaticky {r.autoPoints} b. · ručně {r.selfPoints} b.{r.minutesUsed ? ` · ${r.minutesUsed} min` : ''}</p>
      </div>
      <div class="card"><h3>Body po úlohách</h3><div class="grid-items">{k.items.map((it) => { const v = r.itemPoints[it.n] ?? 0; return <div class={'gi ' + (v === it.max ? 'full' : v ? 'half' : 'zero')}><b>{it.n}</b><small>{v}/{it.max}</small></div>; })}</div></div>
      <button class="secondary" onClick={() => { if (confirm('Smazat tento výsledek?')) { updateProfile(id, (d) => { d.mocks = d.mocks.filter((x) => x.id !== rid); }); back(); } }}>Smazat výsledek</button>
    </div>
  );
}
