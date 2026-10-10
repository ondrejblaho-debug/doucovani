import { useState } from 'preact/hooks';
import { COLORS, EMOJIS, newProfileId, Profile, TrackId, TRACKS } from '../lib/data';
import { updateGlobal } from '../lib/store';

/** Create or edit a profile (name, emoji, colour, track, optional modules, optional school name). */
export function ProfileForm({ initial, onSave, onCancel, title }: { initial?: Profile; onSave: (p: Profile) => void; onCancel?: () => void; title: string }) {
  const [name, setName] = useState(initial?.name || '');
  const [emoji, setEmoji] = useState(initial?.emoji || EMOJIS[0]);
  const [ci, setCi] = useState(Math.max(0, COLORS.findIndex((c) => c[0] === initial?.color)));
  const [track, setTrack] = useState<TrackId | null>(initial?.track || null);
  const [zkk, setZkk] = useState(initial?.zkk ?? false);
  const [english, setEnglish] = useState(initial?.english ?? true);
  const [school, setSchool] = useState(initial?.school || '');
  const ok = name.trim().length > 0 && !!track;
  const save = () => {
    if (!ok) return;
    onSave({ id: initial?.id || newProfileId(), name: name.trim().slice(0, 24), emoji, color: COLORS[ci][0], soft: COLORS[ci][1], track: track!, zkk: track === 'g8' && zkk, english: track === 'g6' && english, school: school.trim().slice(0, 80) || undefined });
  };
  return (
    <div class="card setup">
      <h2>{title}</h2>
      <label class="fld"><span>Jméno nebo přezdívka</span>
        <input class="answer" autoComplete="off" maxLength={24} placeholder="např. Ája" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
      <div class="fld"><span>Obrázek</span>
        <div class="emojis">{EMOJIS.map((e) => <button type="button" class={'chip em' + (e === emoji ? ' on' : '')} aria-label={'obrázek ' + e} onClick={() => setEmoji(e)}>{e}</button>)}</div></div>
      <div class="fld"><span>Barva</span>
        <div class="colors">{COLORS.map((c, i) => <button type="button" class={'swatch' + (i === ci ? ' on' : '')} style={{ background: c[0] }} aria-label={'barva ' + (i + 1)} onClick={() => setCi(i)} />)}</div></div>
      <div class="fld"><span>Kam se hlásíš?</span>
        <div class="tracks">{TRACKS.map((t) => (
          <label class={'track' + (track === t.id ? ' on' : '')}><input type="radio" name="track" checked={track === t.id} onChange={() => setTrack(t.id)} /> {t.label}</label>
        ))}</div></div>
      {track === 'g8' && <label class="toggle"><input type="checkbox" checked={zkk} onChange={(e) => setZkk((e.target as HTMLInputElement).checked)} /> <span>Test z křesťanské kultury (školní test – od ledna 2× týdně 15 min)</span></label>}
      {track === 'g6' && <label class="toggle"><input type="checkbox" checked={english} onChange={(e) => setEnglish((e.target as HTMLInputElement).checked)} /> <span>Angličtina (školní test z AJ – Út a Pá +10 min, v Ostrém tréninku víc)</span></label>}
      <label class="fld"><span>Název školy (nepovinné, zůstane jen v tomto zařízení)</span>
        <input class="answer" autoComplete="off" maxLength={80} placeholder="nepovinné" value={school} onInput={(e) => setSchool((e.target as HTMLInputElement).value)} /></label>
      <div class="row2">
        {onCancel && <button class="secondary" onClick={onCancel}>Zrušit</button>}
        <button class="primary" disabled={!ok} onClick={save}>{initial ? 'Uložit' : 'Vytvořit profil'}</button>
      </div>
    </div>
  );
}

export function Setup({ first, done, cancel, reports }: { first: boolean; done: (id: string) => void; cancel?: () => void; reports?: () => void }) {
  return (
    <div class="screen setupwrap">
      {reports && <button class="secondary" onClick={reports}>Přehledy od dětí (pro rodiče)</button>}
      {first && <div class="intro"><h1>Doučování</h1><p>Příprava na přijímačky CERMAT 2027. Vytvoř si svůj profil – data zůstanou jen v tomto zařízení.</p></div>}
      <ProfileForm title={first ? 'Nový profil' : 'Přidat profil'} onCancel={cancel} onSave={(p) => { updateGlobal((g) => { g.profiles.push(p); g.minutes[p.id] = {}; g.lastProfile = p.id; }); done(p.id); }} />
    </div>
  );
}
