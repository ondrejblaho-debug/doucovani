// "Poslat přehled rodičům": snapshot → compressed link (#r=…) → iOS share sheet / copy fallback.
import { useState } from 'preact/hooks';
import { Icon } from './icons';
import type { ProfileId } from '../lib/data';
import { profileMeta } from '../lib/data';
import { loadGlobal, loadProfile, updateGlobal } from '../lib/store';
import { buildSnapshot } from '../lib/stats';
import { encodeSnap, reportUrl, shareReportLink } from '../lib/report';
import { addDays, fromKey, today as todayKey } from '../lib/dates';

/** The week a report covers: Mon–Sun ending on the most recent Sunday (sending on Monday still counts for the past week). */
export const reportWeek = (d: string) => { const x = addDays(d, -1); return addDays(x, -((fromKey(x).getDay() + 6) % 7)); };
export const reportSentThisWeek = (id: ProfileId, d = todayKey()) => loadGlobal().reportSent?.[id] === reportWeek(d);
/** Weekly reminder on Dnes: Sunday or Monday, not yet sent and not dismissed for that week. */
export const showReportReminder = (id: ProfileId, d = todayKey()) => {
  const wd = fromKey(d).getDay(); const g = loadGlobal(); const w = reportWeek(d);
  return (wd === 0 || wd === 1) && g.reportSent?.[id] !== w && g.reportDismissed?.[id] !== w;
};

export async function makeReportLink(id: ProfileId) {
  const snap = buildSnapshot(id, loadProfile(id), loadGlobal(), todayKey());
  return reportUrl(await encodeSnap(snap));
}

export function ShareReportButton({ id, variant = 'secondary', label = 'Poslat přehled rodičům' }: { id: ProfileId; variant?: 'secondary' | 'primary' | 'link'; label?: string }) {
  const [msg, setMsg] = useState('');
  const [url, setUrl] = useState('');
  const go = async () => {
    const u = await makeReportLink(id);
    const r = await shareReportLink(u, profileMeta(id).name);
    if (r === 'cancelled') return;
    updateGlobal((g) => { (g.reportSent ||= {})[id] = reportWeek(todayKey()); });
    if (r === 'shared') setMsg('Přehled odeslán.');
    else { setUrl(u); setMsg(r === 'copied' ? 'Odkaz zkopírován – vlož ho do zprávy rodičům.' : 'Zkopíruj odkaz a pošli ho rodičům.'); }
  };
  return (
    <div class="sharerep">
      <button class={variant} onClick={go}><Icon name="share" size={18} /> {label}</button>
      {msg && <p class="small muted" role="status">{msg}</p>}
      {url && <textarea class="code replink" readOnly rows={2} value={url} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />}
    </div>
  );
}

export function ReportReminder({ id }: { id: ProfileId }) {
  const [, force] = useState(0);
  if (!showReportReminder(id)) return null;
  return (
    <div class="card reminder">
      <div class="rmh"><Icon name="share" size={20} /><b>Pošli rodičům týdenní přehled</b>
        <button class="icon sm" aria-label="Skrýt připomínku" onClick={() => { updateGlobal((g) => { (g.reportDismissed ||= {})[id] = reportWeek(todayKey()); }); force((n) => n + 1); }}><Icon name="close" size={16} /></button></div>
      <p class="small muted">Jedním odkazem uvidí, kolik ses tento týden učila a co ti jde. Nic se neposílá na žádný server – jen zpráva, kterou odešleš ty.</p>
      <ShareReportButton id={id} variant="primary" label="Poslat přehled" />
    </div>
  );
}
