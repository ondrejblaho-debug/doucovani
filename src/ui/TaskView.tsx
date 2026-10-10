import { useEffect, useMemo, useState } from 'preact/hooks';
import { ActionBar } from './common';
import { Icon } from './icons';
import type { Task } from '../lib/types';
import { checkAnswer, correctAnswerText, Response, unitSuffix } from '../lib/check';
import { BANK } from '../lib/data';
import { mulberry32, hashStr, shuffle } from '../lib/rng';

interface Props { task: Task; onDone: (ok: boolean) => void; review?: boolean }

export function TaskView({ task, onDone, review }: Props) {
  const [resp, setResp] = useState<Response>(null);
  const [result, setResult] = useState<null | boolean>(null);
  const r = useMemo(() => mulberry32(hashStr(task.id)), [task.id]);
  const order = useMemo(() => {
    if (task.kind !== 'order') return [];
    let o = shuffle(r, task.items!);
    if (o.every((x, i) => x === task.items![i])) o = [...o.slice(1), o[0]];
    return o;
  }, [task.id]);
  const [ord, setOrd] = useState<string[]>(order);
  const rights = useMemo(() => (task.kind === 'match' ? shuffle(r, Array.from(new Set(task.pairs!.map((p) => p[1])))) : []), [task.id]);
  const passage = task.passage ? BANK.passages[task.passage] : null;

  const submit = (v: Response) => {
    if (result !== null) return;
    const ok = checkAnswer(task, v);
    setResp(v); setResult(ok);
  };
  const answered = result !== null;
  useEffect(() => { if (answered) document.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [answered]);
  const btnCls = (i: number | boolean) => {
    if (!answered) return 'opt';
    const correct = task.kind === 'yn' ? i === task.answer : i === task.correct;
    if (correct) return 'opt good';
    if (resp === i) return 'opt bad';
    return 'opt dim';
  };

  let body;
  switch (task.kind) {
    case 'mc':
      body = <div class="opts">{task.options!.map((o, i) => <button class={btnCls(i)} disabled={answered} onClick={() => submit(i)}><span class="letter">{'ABCDEFG'[i]}</span>{o}</button>)}</div>;
      break;
    case 'gap':
      body = (<>
        <p class="gap">{task.gapText![0]}<span class="blank">{answered ? task.options![task.correct!] : '…'}</span>{task.gapText![1]}</p>
        <div class="opts row">{task.options!.map((o, i) => <button class={btnCls(i) + ' big'} disabled={answered} onClick={() => submit(i)}>{o}</button>)}</div>
      </>);
      break;
    case 'yn':
      body = <div class="opts row">{[true, false].map((v) => <button class={btnCls(v) + ' big'} disabled={answered} onClick={() => submit(v)}>{v ? 'ANO' : 'NE'}</button>)}</div>;
      break;
    case 'yng': {
      const cur = (resp as boolean[]) || [];
      body = (<>
        <div class="yng">{task.statements!.map((s, i) => (
          <div class={'yngrow' + (answered ? (cur[i] === s.a ? ' good' : ' bad') : '')}>
            <span>{s.s}</span>
            <div class="yn2">{[true, false].map((v) => <button class={'chip' + (cur[i] === v ? ' on' : '')} disabled={answered} onClick={() => { const n = [...cur]; n[i] = v; setResp(n); }}>{v ? 'ANO' : 'NE'}</button>)}</div>
            {answered && cur[i] !== s.a && <small class="fix">Správně: {s.a ? 'ANO' : 'NE'}</small>}
          </div>))}</div>
        {!answered && <ActionBar><button class="primary" disabled={cur.filter((x) => x !== undefined).length < task.statements!.length} onClick={() => submit(cur)}>Zkontrolovat</button></ActionBar>}
      </>);
      break;
    }
    case 'num':
    case 'text': {
      const v = (resp as string) ?? '';
      const chips = task.kind === 'num' ? ['−', ',', ...(task.strict && /\//.test(task.answers![0]) ? ['/'] : []), ...(task.strict && /:/.test(task.answers![0]) ? [':'] : []), ...(/°/.test(task.answers![0]) ? ['°', '′'] : [])] : [];
      body = (<>
        <form class="inrow" onSubmit={(e) => { e.preventDefault(); if (v.trim()) submit(v); }}>
          <input class="answer" value={v} disabled={answered} inputMode={task.kind === 'num' && !task.strict ? 'decimal' : 'text'} autocomplete="off" autocapitalize="off" spellcheck={false} placeholder="Tvoje odpověď" onInput={(e) => setResp((e.target as HTMLInputElement).value)} aria-label="odpověď" />
          {task.unit && <span class="unit">{task.unit}</span>}
        </form>
        {!answered && chips.length > 0 && <div class="chips">{chips.map((c) => <button class="chip" onClick={() => setResp(v + (c === '−' ? '-' : c))}>{c}</button>)}</div>}
        {!answered && <ActionBar><button class="primary" disabled={!v.trim()} onClick={() => submit(v)}>Zkontrolovat</button></ActionBar>}
      </>);
      break;
    }
    case 'match': {
      const cur = (resp as string[]) || [];
      body = (<>
        <div class="match">{task.pairs!.map((p, i) => (
          <label class={'mrow' + (answered ? (cur[i] === p[1] ? ' good' : ' bad') : '')}>
            <span>{p[0]}</span>
            <select disabled={answered} value={cur[i] || ''} onChange={(e) => { const n = [...cur]; n[i] = (e.target as HTMLSelectElement).value; setResp(n); }}>
              <option value="">vyber…</option>
              {rights.map((x) => <option value={x}>{x}</option>)}
            </select>
            {answered && cur[i] !== p[1] && <small class="fix">Správně: {p[1]}</small>}
          </label>))}</div>
        {!answered && <ActionBar><button class="primary" disabled={task.pairs!.some((_, i) => !cur[i])} onClick={() => submit(cur)}>Zkontrolovat</button></ActionBar>}
      </>);
      break;
    }
    case 'order':
      body = (<>
        <ol class="order">{ord.map((x, i) => (
          <li class={answered ? (task.items![i] === x ? 'good' : 'bad') : ''}>
            <span>{x}</span>
            {!answered && <span class="mv"><button class="chip" disabled={i === 0} aria-label="nahoru" onClick={() => { const n = [...ord]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setOrd(n); }}>▲</button><button class="chip" disabled={i === ord.length - 1} aria-label="dolů" onClick={() => { const n = [...ord]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; setOrd(n); }}>▼</button></span>}
          </li>))}</ol>
        {!answered && <ActionBar><button class="primary" onClick={() => submit(ord)}>Zkontrolovat</button></ActionBar>}
      </>);
      break;
  }

  return (
    <div class="task" data-kind={task.kind}>
      {review && <div class="badge rev"><Icon name="repeat" size={14} /> Opakování chyby</div>}
      {passage && passage.audio && <Listen text={passage.text} title={passage.title} answered={answered} />}
      {passage && !passage.audio && <details class="passage" open><summary><Icon name="book" size={16} /> {passage.title || 'Výchozí text'}</summary><div class="ptext">{passage.text}</div></details>}
      <p class="prompt">{task.prompt}</p>
      {body}
      {answered && (
        <div class={'feedback ' + (result ? 'ok' : 'ko')} role="status">
          <b class="fbh"><Icon name={result ? 'check' : 'x'} size={18} /> {result ? 'Správně!' : 'Tentokrát ne.'}</b>
          {!result && !['yng', 'match', 'order'].includes(task.kind) && <div>Správná odpověď: <b>{correctAnswerText(task).replace(/\u00a0/g, ' ')}</b></div>}
          {!result && task.kind === 'order' && <div>Správné pořadí: {task.items!.join(' → ')}</div>}
          <p class="explain">{task.explain}</p>
          {!result && <small>Úlohu ti připomenu v dalších dnech.</small>}
          <ActionBar><button class="primary" autoFocus onClick={() => onDone(!!result)}>Další</button></ActionBar>
        </div>
      )}
    </div>
  );
}
export { unitSuffix };

/** Listening task: the device voice reads the text (works offline with built-in iOS/Android voices). */
function Listen({ text, title, answered }: { text: string; title: string; answered: boolean }) {
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [plays, setPlays] = useState(0);
  const play = (rate: number) => {
    if (!ok) return;
    const ss = window.speechSynthesis;
    ss.cancel();
    const voices = ss.getVoices();
    const v = voices.find((x) => x.lang === 'en-GB') || voices.find((x) => x.lang.startsWith('en'));
    // speak line by line so dialogues get small pauses
    for (const line of text.split('\n').filter((l) => l.trim())) {
      const u = new SpeechSynthesisUtterance(line.replace(/^[A-Z][a-z]+:\s*/, ''));
      u.lang = 'en-GB'; u.rate = rate; if (v) u.voice = v;
      ss.speak(u);
    }
    setPlays((n) => n + 1);
  };
  useEffect(() => () => { if (ok) window.speechSynthesis.cancel(); }, []);
  return (
    <div class="passage listen">
      <b><Icon name="headphones" size={18} /> {title}</b>
      {ok ? (<div class="opts row">
        <button class="secondary" onClick={() => play(0.85)}><Icon name="play" size={16} /> Přehrát</button>
        <button class="secondary" onClick={() => play(0.65)}><Icon name="slow" size={16} /> Pomaleji</button>
      </div>) : <p><small>Toto zařízení neumí číst nahlas – přečti si text.</small></p>}
      <small>V testu uslyšíš nahrávku dvakrát.{plays > 0 ? ` Přehráno: ${plays}×` : ''}</small>
      {(answered || !ok) && <details class="passage" open={!ok}><summary><Icon name="file" size={16} /> Přepis nahrávky</summary><div class="ptext">{text}</div></details>}
    </div>
  );
}
