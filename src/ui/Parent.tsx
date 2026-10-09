import { useState } from 'preact/hooks';
import { ProfileId, student, topic as topicDef, profileMeta } from '../lib/data';
import { ProfileForm } from './Setup';
import { streak, examDays, daysTo } from '../lib/plan';
import { updateGlobal, updateProfile, emptyProfile, loadProfile, removeProfileData } from '../lib/store';
import { makeBackup, shareCode, parseImport, applyBackup } from '../lib/share';
import { addDays, today as todayKey } from '../lib/dates';
import { useStore, pct } from './common';
import { lessonSec } from './Today';
import { Trend } from './Tests';

export function Parent({ unlocked, unlock }: { unlocked: boolean; unlock: () => void }) {
  const { g } = useStore();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  if (!unlocked) {
    const press = (d: string) => {
      const n = (pin + d).slice(0, 4); setPin(n); setErr(false);
      if (n.length === 4) { if (n === g.pin) unlock(); else { setErr(true); setTimeout(() => setPin(''), 400); } }
    };
    return (
      <div class="screen center">
        <div class="card pin">
          <h2>👨‍👧‍👧 Sekce pro rodiče</h2><p class="small">Zadej PIN (výchozí 1234)</p>
          <div class={'dots' + (err ? ' err' : '')}>{[0, 1, 2, 3].map((i) => <i class={i < pin.length ? 'on' : ''} />)}</div>
          <div class="pad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d) => d === '' ? <span /> : <button class="key" aria-label={d === '⌫' ? 'smazat' : d} onClick={() => (d === '⌫' ? setPin(pin.slice(0, -1)) : press(d))}>{d}</button>)}</div>
        </div>
      </div>
    );
  }
  return (
    <div class="screen">
      {g.profiles.length === 0 && <div class="card"><p>Zatím tu není žádný profil.</p></div>}
      {g.profiles.map((pm) => <Overview id={pm.id} />)}
      <Settings />
      <Backup />
    </div>
  );
}

function Overview({ id }: { id: ProfileId }) {
  const { p, g } = useStore(id);
  const t = todayKey();
  const st = student(id);
  const pm = profileMeta(id);
  const [edit, setEdit] = useState(false);
  if (edit) return <ProfileForm title={`Upravit profil – ${pm.name}`} initial={pm} onCancel={() => setEdit(false)} onSave={(np) => { updateGlobal((x) => { const i = x.profiles.findIndex((q) => q.id === id); if (i >= 0) x.profiles[i] = np; }); setEdit(false); }} />;
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const ls = (d: string) => Object.entries(p!.lessons).filter(([k]) => k === d || k.startsWith(d + '#')).map(([, l]) => l);
  const min7 = Math.round(last7.reduce((s, d) => s + ls(d).reduce((a, l) => a + lessonSec(l), 0), 0) / 60);
  const ans7 = last7.flatMap((d) => ls(d).flatMap((l) => l.answers));
  const weak = Object.entries(p!.topics).filter(([, s]) => s.seen >= 3).sort((a, b) => a[1].ema - b[1].ema).slice(0, 4);
  const srs = Object.keys(p!.srs).length;
  return (
    <div class="card overview" style={{ borderTop: `6px solid ${pm.color}` }}>
      <h3>{pm.emoji} {pm.name} · {st.grade}. třída → {st.schoolType}</h3>
      <p class="small">{[pm.school, pm.track === 'g6' ? (pm.english ? 'angličtina zapnutá' : 'angličtina vypnutá') : (pm.zkk ? 'test z křesťanské kultury zapnutý' : '')].filter(Boolean).join(' · ')}</p>
      <div class="row3">
        <div class="stat"><b>🔥 {streak(id, t, p!, g)}</b><small>série</small></div>
        <div class="stat"><b>{min7}</b><small>min / 7 dní</small></div>
        <div class="stat"><b>{pct(ans7.filter((a) => a.ok).length, ans7.length)} %</b><small>správně / 7 dní</small></div>
        <div class="stat"><b>{srs}</b><small>k opakování</small></div>
      </div>
      <div class="week7">{last7.map((d) => { const a = ls(d).flatMap((l) => l.answers); const done = ls(d).some((l) => l.finishedAt); return <div class={done ? 'd done' : a.length ? 'd part' : 'd'} title={d}><small>{d.slice(8)}.</small></div>; })}</div>
      {weak.length > 0 && <p class="small">Nejslabší témata: {weak.map(([tid, s]) => `${topicDef(tid)?.name} (${Math.round(s.ema * 100)} %)`).join(', ')}</p>}
      <Trend results={p!.mocks} color={pm.color} />
      <p class="small">Do přijímaček zbývá {daysTo(t, examDays(id)[0])} dní.</p>
      <div class="row2">
        <button class="secondary" onClick={() => setEdit(true)}>✏️ Upravit profil a moduly</button>
        <button class="link danger" onClick={() => { if (confirm(`Opravdu smazat veškerý pokrok – ${pm.name}? (Nejdřív si udělej zálohu.)`)) updateProfile(id, (d) => Object.assign(d, emptyProfile())); }}>Smazat pokrok</button>
        <button class="link danger" onClick={() => { if (confirm(`Smazat celý profil ${pm.name} z tohoto zařízení?`)) { removeProfileData(id); updateGlobal((x) => { x.profiles = x.profiles.filter((q) => q.id !== id); delete x.minutes[id]; if (x.lastProfile === id) delete x.lastProfile; }); } }}>Smazat profil</button>
      </div>
    </div>
  );
}

const WDS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
function Settings() {
  const { g } = useStore();
  const [np, setNp] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <div class="card">
      <h3>Nastavení</h3>
      <p class="small">Moduly (angličtina, křesťanská kultura) se zapínají u každého profilu tlačítkem „Upravit profil a moduly“.</p>
      <h4>Denní minuty</h4>
      <p class="small">Prázdné = podle plánu (curriculum.json). Neděle je vždy volno.</p>
      {g.profiles.map((pm) => {
        const tmpl = student(pm.track).dailyTemplate;
        return (
          <div class="minrow"><b>{pm.name}</b>
            <div class="mins">{WDS.map((w) => <label><small>{w}</small><input type="number" min="5" max="90" inputMode="numeric" placeholder={String((tmpl[w] || []).filter((b) => b.subject !== 'anglictina').reduce((s, b) => s + b.minutes, 0))} value={g.minutes[pm.id]?.[w] ?? ''} onInput={(e) => { const v = Number((e.target as HTMLInputElement).value); updateGlobal((x) => { if (v > 0) (x.minutes[pm.id] ||= {})[w] = v; else delete x.minutes[pm.id]?.[w]; }); }} /></label>)}</div>
          </div>
        );
      })}
      <h4>Změna PINu</h4>
      <div class="inrow"><input class="answer sm" inputMode="numeric" maxLength={4} placeholder="nový PIN (4 číslice)" value={np} onInput={(e) => setNp((e.target as HTMLInputElement).value.replace(/\D/g, ''))} />
        <button class="secondary" disabled={np.length !== 4} onClick={() => { updateGlobal((x) => { x.pin = np; }); setNp(''); setMsg('PIN změněn.'); }}>Uložit</button></div>
      {msg && <p class="small ok">{msg}</p>}
    </div>
  );
}

function Backup() {
  const [code, setCode] = useState('');
  const [inp, setInp] = useState('');
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([JSON.stringify(makeBackup(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `doucovani-zaloha-${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const doImport = async (text: string) => {
    try { const b = await parseImport(text); if (confirm(`Obnovit zálohu z ${b.exportedAt.slice(0, 10)}? Současná data se přepíšou.`)) { applyBackup(b); setMsg('✔ Záloha obnovena.'); } } catch (e) { setMsg('✘ ' + (e as Error).message); }
  };
  return (
    <div class="card">
      <h3>Záloha a přenos</h3>
      <div class="row2"><button class="secondary" onClick={download}>⬇ Stáhnout zálohu (JSON)</button>
        <button class="secondary" onClick={async () => { const c = await shareCode(); setCode(c); try { await navigator.clipboard.writeText(c); setMsg('Kód zkopírován do schránky.'); } catch { setMsg('Kód zkopíruj ručně.'); } }}>🔗 Kód pro sdílení</button></div>
      {code && <textarea class="code" readOnly rows={3} value={code} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />}
      <h4>Obnovit</h4>
      <label class="secondary file">📂 Načíst soubor JSON<input type="file" accept="application/json,.json" onChange={async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) doImport(await f.text()); }} /></label>
      <textarea class="code" rows={3} placeholder="…nebo sem vlož kód zálohy (DOUC1…) či JSON" value={inp} onInput={(e) => setInp((e.target as HTMLTextAreaElement).value)} />
      <button class="secondary" disabled={!inp.trim()} onClick={() => doImport(inp)}>Obnovit z kódu</button>
      {msg && <p class="small">{msg}</p>}
      <p class="small muted">Data jsou uložena jen v tomto zařízení (v prohlížeči). Zálohu si občas stáhni nebo pošli kód do jiného zařízení.</p>
    </div>
  );
}
export { loadProfile };
