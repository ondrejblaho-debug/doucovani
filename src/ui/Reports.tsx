// Read-only parent report page: opened from a shared link (#r=…) on a parent's phone. No PIN, no profile needed.
import { useEffect, useState } from 'preact/hooks';
import { Icon } from './icons';
import { Dashboard, Compare } from './Dashboard';
import { decodeSnap, loadReports, saveReport, deleteReport } from '../lib/report';
import type { Snap } from '../lib/stats';

export function Reports({ code, leave }: { code?: string; leave: () => void }) {
  const [list, setList] = useState<Snap[]>(() => sorted());
  const [msg, setMsg] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    if (!code) return;
    decodeSnap(code).then((s) => {
      const fresh = saveReport(s);
      setMsg(fresh ? `Přehled (${s.name}) uložen.` : `Tento odkaz je starší než uložený přehled (${s.name}) – ponechán novější.`);
      setSel(s.pid); setList(sorted());
      history.replaceState(null, '', location.pathname + location.search + '#prehledy');
    }).catch(() => setMsg('Odkaz se nepodařilo přečíst – je celý?'));
  }, [code]);
  const cur = list.find((s) => s.pid === sel) || list[0];
  return (
    <div class="reports">
      <div class="appbar"><span class="who"><Icon name="chart" size={20} /> <span>Přehledy od dětí</span></span><button class="link" onClick={leave}>Aplikace</button></div>
      <main class="screen">
        {msg && <div class="note" role="status"><Icon name="check" size={16} /> {msg}</div>}
        {!list.length && <div class="card"><h2>Zatím žádný přehled</h2><p class="small">Na telefonu dítěte otevři Rodič → „Poslat přehled rodičům“ a odkaz otevři tady. Každý nový přehled nahradí starší přehled téhož dítěte.</p></div>}
        {list.length > 1 && <Compare snaps={list} />}
        {list.length > 1 && <div class="seg narrow" role="tablist">{list.map((s) => <button role="tab" class={cur?.pid === s.pid ? 'on' : ''} onClick={() => setSel(s.pid)}>{s.name}</button>)}</div>}
        {cur && <div class={'dashgrid n' + list.length}>{list.map((s) => <div class={'dcol' + (s.pid === cur.pid ? ' sel' : '')}><Dashboard s={s} report actions={<button class="link danger small" onClick={() => { if (confirm(`Smazat uložený přehled – ${s.name}?`)) { deleteReport(s.pid); setList(sorted()); } }}>Smazat přehled</button>} /></div>)}</div>}
        <p class="small muted center">Přehled je jen pro čtení a je uložený pouze v tomto prohlížeči. Data se nikam neodesílají.</p>
      </main>
    </div>
  );
}
const sorted = () => Object.values(loadReports()).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
export const hasReports = () => Object.keys(loadReports()).length;
