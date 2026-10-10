import { useState } from 'preact/hooks';
import { Icon } from './icons';
import { ProfileId, profileMeta, student, topicsFor, topic as topicDef } from '../lib/data';
import { dayPlan, dayStatus, streak, examDays, daysTo, DayStatus, phaseName, schoolTests } from '../lib/plan';
import { addDays, fmtLong, fromKey, MONTHS_NOM, pad, today as todayKey, toKey } from '../lib/dates';
import { useStore, pct, Ring, SUBJ_LABEL } from './common';
import { lessonSec } from './Today';
import type { ProfileData } from '../lib/store';

const ST_LABEL: Record<DayStatus, string> = { done: 'splněno', partial: 'částečně', missed: 'vynecháno', free: 'volno', mock: 'test nanečisto', 'mock-done': 'test hotový', exam: 'přijímačky', planned: 'naplánováno', today: 'dnes', none: '' };

function dayStats(p: ProfileData, date: string) {
  const ls = Object.entries(p.lessons).filter(([k]) => k === date || k.startsWith(date + '#')).map(([, l]) => l);
  const answers = ls.flatMap((l) => l.answers);
  return { sec: ls.reduce((s, l) => s + lessonSec(l), 0), n: answers.length, ok: answers.filter((a) => a.ok).length, topics: Array.from(new Set(answers.map((a) => a.topic))) };
}

export function Calendar({ id }: { id: ProfileId }) {
  const { p, g } = useStore(id);
  const t = todayKey();
  const meta = profileMeta(id);
  const [month, setMonth] = useState(t.slice(0, 7));
  const [sel, setSel] = useState<string | null>(t);
  const ex = examDays(id);
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const startDow = (fromKey(first).getDay() + 6) % 7;
  const nDays = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: nDays }, (_, i) => `${month}-${pad(i + 1)}`)];
  const shift = (k: number) => { const d = new Date(y, m - 1 + k, 1); setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const s = streak(id, t, p!, g);
  const sch = schoolTests(id, g);
  // totals
  const all = Object.values(p!.lessons).flatMap((l) => l.answers);
  const totalMin = Math.round(Object.values(p!.lessons).reduce((a, l) => a + lessonSec(l), 0) / 60);

  return (
    <div class="screen">
      <div class="row3">
        <div class="stat"><b>{s}</b><small>série</small></div>
        <div class="stat"><b>{daysTo(t, ex[0])}</b><small>dní do JPZ</small></div>
        <div class="stat"><b>{totalMin}</b><small>minut celkem</small></div>
        <div class="stat"><b>{pct(all.filter((a) => a.ok).length, all.length)} %</b><small>úspěšnost</small></div>
      </div>
      <div class="card">
        <div class="calhead">
          <button class="icon" aria-label="Předchozí měsíc" onClick={() => shift(-1)}><Icon name="chevL" /></button>
          <h2>{MONTHS_NOM[m - 1]} {y}</h2>
          <button class="icon" aria-label="Další měsíc" onClick={() => shift(1)}><Icon name="chevR" /></button>
        </div>
        <div class="cal">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((d) => <div class="dow">{d}</div>)}
          {cells.map((d) => {
            if (!d) return <div />;
            const st = dayStatus(id, d, t, p!, g);
            const ds = dayStats(p!, d);
            return (
              <button class={`day st-${st}${d === t ? ' is-today' : ''}${d === sel ? ' sel' : ''}`} onClick={() => setSel(d)} aria-label={`${d} ${ST_LABEL[st]}${sch[d] ? ' ' + sch[d] : ''}`}>
                <span class="dn">{Number(d.slice(8))}</span>
                <span class="sd" />
                {sch[d] && <span class="dm sch" title={sch[d]}>{sch[d].includes('AJ') ? 'AJ' : 'KK'}</span>}
              </button>
            );
          })}
        </div>
        <div class="legend">{(['done', 'partial', 'missed', 'mock', 'exam'] as DayStatus[]).map((k) => <span><i class={'lg st-' + k} />{ST_LABEL[k]}</span>)}{Object.keys(sch).length > 0 && <span><i class="lg sch">{Object.values(sch)[0].includes('AJ') ? 'AJ' : 'KK'}</i>{Object.values(sch)[0]}</span>}</div>
      </div>
      {sel && <DayDetail id={id} date={sel} />}
      <Mastery id={id} color={meta.color} />
    </div>
  );
}

function DayDetail({ id, date }: { id: ProfileId; date: string }) {
  const { p, g } = useStore(id);
  const plan = dayPlan(id, date, g);
  const st = dayStatus(id, date, todayKey(), p!, g);
  const ds = dayStats(p!, date);
  const mocks = p!.mocks.filter((m) => m.date === date || m.mockDate === date);
  return (
    <div class="card detail">
      <h3>{fmtLong(date)} <span class={'pill st-' + st}>{ST_LABEL[st]}</span></h3>
      {plan.week && <p class="small">{plan.week.weekNumber}. týden · {phaseName(plan.week.phase)}</p>}
      {plan.kind === 'lesson' && <p>Plán: {plan.blocks.map((b) => `${b.label} ${b.minutes} min`).join(', ')}</p>}
      {plan.kind === 'mock' && <p><Icon name="test" size={16} /> {plan.mock!.label} – JPZ {plan.mock!.testYear}, {plan.mock!.testTerm}</p>}
      {plan.kind === 'exam' && <p><Icon name="cap" size={16} /> {plan.examLabel}</p>}
      {plan.schoolTest && <p class="schooltest"><Icon name="flag" size={16} /> <b>{plan.schoolTest}</b> – přesný termín ověř v pozvánce ze školy.</p>}
      {ds.n > 0 ? (
        <p><b>{Math.max(1, Math.round(ds.sec / 60))} min</b> · {ds.n} úloh · <b>{pct(ds.ok, ds.n)} %</b> správně<br /><small>{ds.topics.map((x) => topicDef(x)?.name || x).join(', ')}</small></p>
      ) : <p class="small">Žádné záznamy.</p>}
      {mocks.map((m) => <p><Icon name="test" size={16} /> {m.testId}: <b>{m.points} / {m.max} b.</b></p>)}
      {plan.week?.note && <p class="small muted"><Icon name="pin" size={14} /> {plan.week.note}</p>}
    </div>
  );
}

export function Mastery({ id, color }: { id: ProfileId; color: string }) {
  const { p } = useStore(id);
  const grade = student(id).grade;
  const pr = profileMeta(id);
  const topics = topicsFor(grade).filter((t) => (pr.english || !t.id.startsWith('en7-')) && (pr.zkk || t.id !== 'zkk-krestanska-kultura'));
  const groups: Record<string, typeof topics> = {};
  for (const t of topics) (groups[t.subject] ||= []).push(t);
  return (
    <div class="card">
      <h3>Zvládnutí témat</h3>
      {Object.entries(groups).map(([subj, ts]) => (
        <div class="mgroup">
          <h4>{SUBJ_LABEL[subj] || subj}</h4>
          {ts.map((t) => {
            const s = p!.topics[t.id];
            const v = s ? Math.round(s.ema * 100) : null;
            const lvl = v === null ? 'none' : v >= 80 ? 'hi' : v >= 50 ? 'mid' : 'lo';
            return (<div class={'mrow2 ' + lvl}><span>{t.name}</span><span class="bar"><i style={{ width: `${v ?? 0}%` }} /></span><small>{v === null ? '–' : `${v} %`}<br />{s ? `${s.seen}×` : ''}</small></div>);
          })}
        </div>
      ))}
      <p class="small">Zvládnutí = vážená úspěšnost posledních odpovědí (novější odpovědi mají větší váhu).</p>
    </div>
  );
}
