import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './icons';
import { ProfileId, student, topic as topicDef, profileMeta } from '../lib/data';
import { dayPlan, streak, phaseName, examDays, daysTo, planStart } from '../lib/plan';
import { buildLesson, recordAnswer, dueReviews } from '../lib/lesson';
import { resolveTask } from '../lib/tasks';
import { updateProfile, LessonState } from '../lib/store';
import { fmtLong, fmtShort, today as todayKey } from '../lib/dates';
import { CARDS } from '../content/cards';
import { TaskView } from './TaskView';
import { useStore, Ring, pct, useFocusMode, ActionBar } from './common';

export function Today({ id, go }: { id: ProfileId; go: (tab: string) => void }) {
  const { p, g } = useStore(id);
  const date = todayKey();
  const plan = dayPlan(id, date, g);
  const meta = profileMeta(id);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [active]);
  const st = student(id);
  const ex = examDays(id);
  const lesson = p!.lessons[date];
  const extraKeys = Object.keys(p!.lessons).filter((k) => k.startsWith(date + '#'));
  const openExtra = extraKeys.find((k) => !p!.lessons[k].finishedAt);

  if (active && p!.lessons[active]) return <LessonRunner id={id} lkey={active} onExit={() => setActive(null)} />;

  const start = (kind: 'daily' | 'extra') => {
    const key = kind === 'daily' ? date : openExtra || `${date}#${extraKeys.length + 1}`;
    if (!p!.lessons[key]) updateProfile(id, (d) => { d.lessons[key] = buildLesson(id, date, d, g, kind); });
    setActive(key);
  };
  const s = streak(id, date, p!, g);
  const due = dueReviews(p!, date).length;
  const done = lesson?.finishedAt;
  const ok = lesson ? lesson.answers.filter((a) => a.ok).length : 0;

  return (
    <div class="screen">
      <header class="hello">
        <div>
          <h1>Ahoj, {meta.name}!</h1>
          <p>{fmtLong(date)}{plan.week ? ` · ${plan.week.weekNumber}. týden · ${phaseName(plan.week.phase)}` : ''}</p>
        </div>
        <div class="stats">
          <div><b><Icon name="flame" size={18} /> {s}</b><small>{s === 1 ? 'den' : s >= 2 && s <= 4 ? 'dny' : 'dní'} v řadě</small></div>
          <div><b>{daysTo(date, ex[0])}</b><small>dní do zkoušky</small></div>
        </div>
      </header>

      {plan.kind === 'before' && <div class="card info"><h2>Plán začíná v pondělí {fmtShort(planStart(id))}</h2><p>Do té doby si můžeš zkusit krátkou rozcvičku z prvního týdne.</p></div>}
      {plan.kind === 'free' && <div class="card info"><h2>Dnes je volno</h2><p>Neděle je na odpočinek. Jestli chceš, můžeš si dobrovolně procvičovat.</p></div>}
      {plan.schoolTest && <div class="card info"><h2><Icon name="flag" /> Možná dnes: {plan.schoolTest}</h2><p>Termín je odhadnutý podle loňska – ověř si ho v pozvánce ze školy. Dnešní lekce je jen krátká.</p></div>}
      {plan.kind === 'exam' && <div class="card exam"><h2><Icon name="cap" /> {plan.examLabel}</h2><p>Hodně štěstí! Vyspi se, nasnídej se a vezmi si propisku (na matiku i rýsovací potřeby). Věříme ti!</p></div>}
      {plan.kind === 'after' && <div class="card info"><h2>Přijímačky jsou za námi</h2><p>Plán skončil. Procvičovat můžeš dál, kdykoli chceš.</p></div>}
      {plan.kind === 'mock' && (
        <div class="card mock"><h2><Icon name="test" /> Dnes: {plan.mock!.label}</h2>
          <p>Test JPZ {plan.mock!.testYear}, {plan.mock!.testTerm}. Čeština 60 min, přestávka, matematika 70 min.</p>
          <button class="primary" onClick={() => go('test')}>Otevřít test</button></div>
      )}

      {plan.kind === 'lesson' && (
        <div class="card lesson">
          <h2>Dnešní lekce · {plan.minutes} min</h2>
          <ul class="blocks">{plan.blocks.map((b) => (
            <li><span class={'dot ' + b.subject} /><div><b>{b.label}</b> <small>{b.minutes} min</small><br /><small>{b.topics.filter((t) => !t.endsWith('-mix') || b.topics.length === 1).slice(0, 4).map((t) => topicDef(t)?.name || t).join(' · ')}</small></div></li>
          ))}</ul>
          {due > 0 && <p class="note"><Icon name="repeat" size={16} /> Čeká na tebe {due} {due === 1 ? 'úloha' : due <= 4 ? 'úlohy' : 'úloh'} k zopakování – přimíchám je do lekce.</p>}
          {plan.week?.note && <p class="note small"><Icon name="pin" size={15} /> {plan.week.note}</p>}
          {!lesson && <button class="primary big sticky-cta" onClick={() => start('daily')}>Začít lekci</button>}
          {lesson && !done && <button class="primary big sticky-cta" onClick={() => start('daily')}>Pokračovat ({lesson.idx}/{lesson.tasks.length})</button>}
          {done && <div class="donebox"><Ring value={ok / Math.max(1, lesson.answers.length)} color="var(--accent)" size={64} /><div><b>Hotovo!</b><br /><small>{ok} z {lesson.answers.length} správně · {Math.round(lessonSec(lesson) / 60)} min</small></div></div>}
        </div>
      )}
      {(plan.kind !== 'lesson' || done) && plan.kind !== 'exam' && (
        <div class="card"><h3>Procvičování navíc</h3><p class="small">Krátká sada úloh – {plan.kind === 'lesson' ? 'z témat tohoto týdne a opakování chyb' : 'z aktuálních témat'}.</p>
          <button class="secondary" onClick={() => (plan.kind === 'before' || plan.kind === 'free' || plan.kind === 'after' || plan.kind === 'mock') && !p!.lessons[date] ? start('daily') : start('extra')}>{openExtra ? 'Pokračovat v procvičování' : 'Procvičovat'}</button></div>
      )}
    </div>
  );
}

export const lessonSec = (l: LessonState) => l.cardSec + l.answers.reduce((s, a) => s + a.sec, 0);

function LessonRunner({ id, lkey, onExit }: { id: ProfileId; lkey: string; onExit: () => void }) {
  const { p } = useStore(id);
  const l = p!.lessons[lkey];
  const meta = profileMeta(id);
  const [cardIdx, setCardIdx] = useState(l.idx === 0 && l.answers.length === 0 ? 0 : l.cards.length);
  const t0 = useRef(Date.now());
  useEffect(() => { t0.current = Date.now(); window.scrollTo(0, 0); }, [l.idx, cardIdx]);
  const date = todayKey();
  useFocusMode(true);

  if (cardIdx < l.cards.length) {
    const tid = l.cards[cardIdx]; const c = CARDS[tid];
    return (
      <div class="screen runner">
        <TopBar onExit={onExit} progress={0} color={meta.color} label={`Vysvětlení ${cardIdx + 1}/${l.cards.length}`} />
        <div class="card explain-card">
          <small class="kicker">{topicDef(tid)?.name}</small>
          <h2>{c.intro}</h2>
          <ul>{c.points.map((x) => <li>{x}</li>)}</ul>
          {c.example && <p class="example"><b>Příklad:</b> {c.example}</p>}
          {c.tip && <p class="tip"><Icon name="bulb" size={16} /> {c.tip}</p>}
          <ActionBar><button class="primary big" onClick={() => { const sec = Math.min(180, (Date.now() - t0.current) / 1000); updateProfile(id, (d) => { d.lessons[lkey].cardSec += sec; }); setCardIdx(cardIdx + 1); }}>{cardIdx + 1 < l.cards.length ? 'Další téma' : 'Jdeme na úlohy'}</button></ActionBar>
        </div>
      </div>
    );
  }
  if (l.idx >= l.tasks.length) {
    const ok = l.answers.filter((a) => a.ok).length;
    return (
      <div class="screen runner">
        <div class="topbar"><button class="icon" aria-label="Zavřít" onClick={onExit}><Icon name="close" /></button><small>Lekce dokončena</small></div>
        <div class="card center finish">
          <div class="confetti"><Icon name="trophy" size={40} /></div>
          <h2>Skvělá práce!</h2>
          <Ring value={ok / Math.max(1, l.answers.length)} color="var(--accent)" size={110} />
          <p>{ok} z {l.answers.length} správně · {Math.max(1, Math.round(lessonSec(l) / 60))} min</p>
          {l.answers.some((a) => !a.ok) && <p class="small">Chyby se uložily do opakování – objeví se v dalších dnech.</p>}
          <ActionBar><button class="primary big" onClick={onExit}>Zpět na Dnes</button></ActionBar>
        </div>
      </div>
    );
  }
  const ref = l.tasks[l.idx];
  const task = resolveTask(ref.id)!;
  const done = (ok: boolean) => {
    const sec = Math.min(240, Math.max(3, (Date.now() - t0.current) / 1000));
    updateProfile(id, (d) => {
      const L = d.lessons[lkey];
      L.answers.push({ id: ref.id, topic: task.topic, subject: task.subject, ok, sec: Math.round(sec), review: ref.review });
      recordAnswer(d, ref.id, task.topic, ok, date, !!ref.review);
      L.idx++;
      if (L.idx >= L.tasks.length) L.finishedAt = Date.now();
    });
  };
  return (
    <div class="screen runner">
      <TopBar onExit={onExit} progress={l.idx / l.tasks.length} color={meta.color} label={`${l.idx + 1} / ${l.tasks.length} · ${ref.block}`} />
      <small class="kicker topic">{topicDef(task.topic)?.name}</small>
      <TaskView key={ref.id + ':' + l.idx} task={task} onDone={done} review={ref.review} />
    </div>
  );
}

function TopBar({ onExit, progress, color, label }: { onExit: () => void; progress: number; color: string; label: string }) {
  return (
    <div class="topbar">
      <button class="icon" aria-label="Zavřít" onClick={onExit}><Icon name="close" /></button>
      <div class="pbar"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <small>{label}</small>
    </div>
  );
}
export { pct };
