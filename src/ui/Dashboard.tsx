// Parent progress dashboard – renders purely from a Snapshot (works on the child's phone and from a shared link).
import { Avatar } from './icons';
import { Snap, SUBJ_ORDER, SUBJ_NAME, splitTopics, fmtMin, Subj } from '../lib/stats';
import { topic as topicDef, KEYS } from '../lib/data';
import { resolveTask } from '../lib/tasks';
import { addDays, fromKey, fmtShort, fmtFull, toKey } from '../lib/dates';
import { BENCHMARKS } from '../content/benchmarks';
import type { ComponentChildren } from 'preact';

const TRACK_LABEL = { g8: '8leté gymnázium · 5. třída', g6: '6leté gymnázium · 7. třída' } as const;
const pctOf = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
export const snapTime = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const testLabel = (id: string) => { const k = KEYS.find((x) => x.id === id); return k ? `${k.subject === 'cestina' ? 'ČJL' : 'MA'} ${k.year}, ${k.term}` : id; };
export const plural = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);

export function Dashboard({ s, report, actions }: { s: Snap; report?: boolean; actions?: ComponentChildren }) {
  const wkMin = Math.round(s.wk[0] / 60), lastMin = Math.round(s.wk[1] / 60);
  const planPct = pctOf(s.plan[1], s.plan[0]);
  return (
    <div class="dash" data-pid={s.pid}>
      <div class="card dhead">
        <div class="ovh"><Avatar emoji={s.emoji} color={s.color} size={36} /><div><h2>{s.name}</h2><small class="muted">{TRACK_LABEL[s.track]}{s.en ? ' · angličtina' : ''}{s.zkk ? ' · křesťanská kultura' : ''}</small></div></div>
        <p class="small muted">{report ? <>Stav k <b class="snapat">{snapTime(s.at)}</b> · </> : null}do přijímaček {s.exam} {plural(s.exam, 'den', 'dny', 'dní')}</p>
        {actions}
      </div>
      <div class="kpis">
        <Kpi label="Tento týden" value={`${wkMin} min`} sub={`minulý týden ${lastMin} min`} />
        <Kpi label="Celkem" value={fmtMin(s.tot.sec)} sub={`${s.tot.tasks} úloh · ${s.tot.days} ${plural(s.tot.days, 'den', 'dny', 'dní')}`} />
        <Kpi label="Plnění plánu" value={`${planPct} %`} sub={`${s.plan[1]} z ${s.plan[0]} dní · ${s.missed} ${plural(s.missed, 'vynechaný', 'vynechané', 'vynechaných')}`} />
        <Kpi label="Série" value={`${s.streak} ${plural(s.streak, 'den', 'dny', 'dní')}`} sub={`úspěšnost ${pctOf(s.tot.ok, s.tot.tasks)} %`} />
      </div>
      <DailyChart s={s} />
      <Subjects s={s} />
      <Topics s={s} />
      <Mistakes s={s} />
      <Mocks s={s} />
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div class="kpi"><small>{label}</small><b>{value}</b><span>{sub}</span></div>;
}

function DailyChart({ s }: { s: Snap }) {
  const n = s.min.length, W = 340, H = 120, top = 8, bot = 22, left = 4;
  const max = Math.max(30, ...s.min, ...s.pm);
  const bw = (W - left) / n;
  const y = (v: number) => H - bot - (v / max) * (H - top - bot);
  const active = s.min.filter((m) => m > 0);
  const avg = active.length ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : 0;
  return (
    <div class="card">
      <div class="ch"><h3>Čas za den</h3><small class="muted">{n} dní · ø {avg} min v aktivní dny</small></div>
      <svg class="chart daily" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minuty za den">
        <line x1={left} x2={W} y1={H - bot} y2={H - bot} stroke="var(--line2)" />
        {s.min.map((m, i) => {
          const d = addDays(s.d0, i), x = left + i * bw, c = s.st[i];
          const mon = fromKey(d).getDay() === 1;
          return <g>
            {s.pm[i] > 0 && <line class="plan" x1={x + 1.5} x2={x + bw - 1.5} y1={y(s.pm[i])} y2={y(s.pm[i])} />}
            {m > 0 && <rect x={x + 2} y={y(m)} width={bw - 4} height={H - bot - y(m)} rx="2" fill="var(--accent)"><title>{`${fmtShort(d)}: ${m} min`}</title></rect>}
            <circle cx={x + bw / 2} cy={H - bot + 7} r="2.2" class={'sdot s-' + c} />
            {mon && <text x={x + 1} y={H - 2} font-size="8.5" fill="var(--text3)">{fmtShort(d)}</text>}
          </g>;
        })}
      </svg>
      <div class="legend"><span><i class="lg bar" />minuty</span><span><i class="lg planl" />plán</span><span><i class="lg st-done" />splněno</span><span><i class="lg st-partial" />částečně</span><span><i class="lg st-missed" />vynecháno</span></div>
    </div>
  );
}

function Spark({ w }: { w: (number | null)[] }) {
  const W = 84, H = 26, pts = w.map((v, i) => (v == null ? null : [4 + (i * (W - 8)) / Math.max(1, w.length - 1), H - 3 - (v / 100) * (H - 6)] as [number, number]));
  const segs: string[] = []; let cur: string[] = [];
  for (const p of pts) { if (p) cur.push(p.join(',')); else if (cur.length) { segs.push(cur.join(' ')); cur = []; } }
  if (cur.length) segs.push(cur.join(' '));
  const y75 = H - 3 - 0.75 * (H - 6);
  return (
    <svg class="spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line x1="0" x2={W} y1={y75} y2={y75} stroke="var(--line2)" stroke-dasharray="2 2" />
      {segs.map((sg) => <polyline points={sg} fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" />)}
      {pts.map((p) => p && <circle cx={p[0]} cy={p[1]} r="1.8" fill="var(--accent)" />)}
    </svg>
  );
}

function Subjects({ s }: { s: Snap }) {
  const rows = SUBJ_ORDER.filter((k) => s.subj[k]);
  return (
    <div class="card">
      <div class="ch"><h3>Úspěšnost podle předmětů</h3><small class="muted">trend 6 týdnů</small></div>
      {!rows.length && <p class="small muted">Zatím žádné vyřešené úlohy.</p>}
      {rows.map((k) => { const o = s.subj[k as Subj]!; return (
        <div class="srow"><div><b>{SUBJ_NAME[k]}</b><small>{o.n} úloh · {fmtMin(o.sec)}</small></div><Spark w={o.w} /><span class="big">{pctOf(o.ok, o.n)} %</span></div>
      ); })}
    </div>
  );
}

type TR = { id: string; n: number; pct: number };
function TopicRow({ r }: { r: TR }) {
  return <div class="trow"><span>{topicDef(r.id)?.name || r.id}</span><span class="bar"><i style={{ width: `${r.pct}%` }} /></span><small>{r.pct} % · {r.n}×</small></div>;
}
function TopicList({ title, rows, empty, cls }: { title: string; rows: TR[]; empty: string; cls: string }) {
  const head = rows.slice(0, 6), rest = rows.slice(6);
  return (
    <div class={'tlist ' + cls}><h4>{title} <span class="cnt">{rows.length}</span></h4>
      {!rows.length && <p class="small muted">{empty}</p>}
      {head.map((r) => <TopicRow r={r} />)}
      {rest.length > 0 && <details><summary class="small">další ({rest.length})</summary>{rest.map((r) => <TopicRow r={r} />)}</details>}
    </div>
  );
}
function Topics({ s }: { s: Snap }) {
  const { strong, weak, few } = splitTopics(s);
  return (
    <div class="card">
      <div class="ch"><h3>Témata</h3><small class="muted">úspěšnost, min. 3 pokusy</small></div>
      <TopicList cls="strong" title="Jde jí" rows={strong} empty="Zatím žádné téma nad 75 %." />
      <TopicList cls="weak" title="Potřebuje procvičit" rows={weak} empty="Žádné slabé téma – výborně." />
      {few > 0 && <p class="small muted">{few} {plural(few, 'téma má', 'témata mají', 'témat má')} zatím méně než 3 pokusy.</p>}
    </div>
  );
}

function Mistakes({ s }: { s: Snap }) {
  const byTopic: Record<string, number> = {};
  for (const [, t, n] of s.mis) byTopic[t] = (byTopic[t] || 0) + n;
  const topT = Object.entries(byTopic).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div class="card">
      <div class="ch"><h3>Nejčastější chyby</h3></div>
      {!s.mis.length && <p class="small muted">Zatím žádné chyby.</p>}
      {topT.length > 0 && <p class="small muted">Nejvíc chyb: {topT.map(([t, n]) => `${topicDef(t)?.name || t} (${n}×)`).join(', ')}</p>}
      <ul class="mis">{s.mis.map(([id, t, n, q]) => {
        let p = ''; try { p = resolveTask(id)?.prompt?.replace(/\s+/g, ' ') || ''; } catch { /* unknown task */ }
        p = p || topicDef(t)?.name || id;
        return <li><div><span>{p.length > 96 ? p.slice(0, 94) + '…' : p}</span><small>{topicDef(t)?.name}</small></div><div class="mr"><b>{n}×</b>{q ? <span class="pill">opakuje</span> : null}</div></li>;
      })}</ul>
    </div>
  );
}

function Mocks({ s }: { s: Snap }) {
  const bm = BENCHMARKS[s.track];
  const W = 320, H = 140, P = 26;
  const xs = s.mocks.map((_, i) => P + (s.mocks.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (s.mocks.length - 1)));
  const y = (v: number, m = 50) => H - 20 - ((v / m) * (H - 34));
  const line = (sj: 'c' | 'm') => s.mocks.map((r, i) => (r[2] === sj ? `${xs[i]},${y(r[3], r[4])}` : null)).filter(Boolean).join(' ');
  return (
    <div class="card">
      <div class="ch"><h3>Testy nanečisto</h3>{bm && <small class="muted">srovnání {bm.year}</small>}</div>
      {!s.mocks.length ? <p class="small muted">Zatím žádný test nanečisto.</p> : (
        <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Body v testech nanečisto">
          {[0, 25, 50].map((v) => <g><line x1={P} x2={W - 6} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={4} y={y(v) + 3} font-size="9" fill="var(--text3)">{v}</text></g>)}
          {bm?.lines.map((b, i) => <g><line x1={P} x2={W - 6} y1={y(b.points)} y2={y(b.points)} stroke="var(--text3)" stroke-dasharray={i ? '2 3' : '6 3'} /><text x={W - 6} y={y(b.points) - 3} font-size="8.5" text-anchor="end" fill="var(--text3)">{b.label} ≈ {b.points}</text></g>)}
          <polyline points={line('c')} fill="none" stroke="var(--accent)" stroke-width="2" />
          <polyline points={line('m')} fill="none" stroke="var(--text2)" stroke-width="2" stroke-dasharray="5 3" />
          {s.mocks.map((r, i) => <circle cx={xs[i]} cy={y(r[3], r[4])} r="3.5" fill={r[2] === 'c' ? 'var(--accent)' : 'var(--text2)'} />)}
          <text x={P} y={H - 3} font-size="9" fill="var(--accent)">— ČJL</text><text x={P + 44} y={H - 3} font-size="9" fill="var(--text2)">- - MA</text>
        </svg>
      )}
      {s.mocks.length > 0 && <ul class="plain mocklist">{[...s.mocks].reverse().map(([id, d, , pts, max]) => {
        const ref = bm?.lines[0];
        const diff = ref ? Math.round(((pts / max) * 50 - ref.points) * 10) / 10 : null;
        return <li><span>{fmtFull(d)}</span><span class="muted">{testLabel(id)}</span><b>{pts}/{max}</b>{diff != null && <small class={diff >= 0 ? 'ok' : 'muted'}>{diff >= 0 ? '+' : ''}{diff}</small>}</li>;
      })}</ul>}
      {bm ? <p class="small muted">{bm.note} Číslo vpravo = rozdíl proti průměru přijatých.</p> : <p class="small muted">Celostátní srovnání pro 6letá gymnázia zatím není k dispozici.</p>}
    </div>
  );
}

/** Side-by-side summary of several children (received reports). */
export function Compare({ snaps }: { snaps: Snap[] }) {
  const rows: [string, (s: Snap) => string][] = [
    ['Tento týden', (s) => `${Math.round(s.wk[0] / 60)} min`],
    ['Minulý týden', (s) => `${Math.round(s.wk[1] / 60)} min`],
    ['Celkem', (s) => fmtMin(s.tot.sec)],
    ['Plnění plánu', (s) => `${pctOf(s.plan[1], s.plan[0])} %`],
    ['Vynechané dny', (s) => String(s.missed)],
    ['Série', (s) => `${s.streak} d`],
    ['Úspěšnost', (s) => `${pctOf(s.tot.ok, s.tot.tasks)} %`],
    ['Matematika', (s) => (s.subj.matematika ? `${pctOf(s.subj.matematika.ok, s.subj.matematika.n)} %` : '–')],
    ['Čeština', (s) => (s.subj.cestina ? `${pctOf(s.subj.cestina.ok, s.subj.cestina.n)} %` : '–')],
    ['Poslední test', (s) => { const m = s.mocks[s.mocks.length - 1]; return m ? `${m[3]}/${m[4]}` : '–'; }],
    ['Nejslabší téma', (s) => { const w = splitTopics(s).weak[0]; return w ? topicDef(w.id)?.name || '–' : '–'; }],
  ];
  return (
    <div class="card compare">
      <h3>Srovnání</h3>
      <table>
        <thead><tr><th />{snaps.map((s) => <th><Avatar emoji={s.emoji} color={s.color} size={26} /><div>{s.name}</div><small>k {fmtShort(toKey(new Date(s.at)))}</small></th>)}</tr></thead>
        <tbody>{rows.map(([l, f]) => <tr><td>{l}</td>{snaps.map((s) => <td>{f(s)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
