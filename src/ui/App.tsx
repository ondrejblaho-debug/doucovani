import { useEffect, useState } from 'preact/hooks';
import { ProfileId, profileMeta, student } from '../lib/data';
import { Setup } from './Setup';
import { loadGlobal, updateGlobal } from '../lib/store';
import { Today } from './Today';
import { Calendar } from './Calendar';
import { Tests } from './Tests';
import { Parent } from './Parent';
import { useStore } from './common';
import { streak } from '../lib/plan';
import { today } from '../lib/dates';
import { loadProfile } from '../lib/store';

type Tab = 'dnes' | 'kalendar' | 'test' | 'rodic';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dnes', label: 'Dnes', icon: '☀️' },
  { id: 'kalendar', label: 'Kalendář', icon: '📅' },
  { id: 'test', label: 'Test', icon: '📝' },
  { id: 'rodic', label: 'Rodič', icon: '🔒' },
];

export function App() {
  const [profile, setProfile] = useState<ProfileId | null>(() => { const q = new URLSearchParams(location.search).get('p'); return q && loadGlobal().profiles.some((x) => x.id === q) ? q : null; });
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Tab>('dnes');
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const meta = profile ? profileMeta(profile) : null;
    document.documentElement.style.setProperty('--accent', meta?.color || '#5c6bc0');
    document.documentElement.style.setProperty('--soft', meta?.soft || '#eef0fb');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', meta?.color || '#5c6bc0');
  }, [profile]);
  useEffect(() => { if (tab !== 'rodic') setUnlocked(false); }, [tab]);

  const { g } = useStore();
  const valid = profile && g.profiles.some((x) => x.id === profile);
  if (!g.profiles.length || adding) return <Setup first={!g.profiles.length} cancel={g.profiles.length ? () => setAdding(false) : undefined} done={(id) => { setAdding(false); setProfile(id); setTab('dnes'); }} />;
  if (!valid) return <Picker add={() => setAdding(true)} pick={(id) => { updateGlobal((x) => { x.lastProfile = id; }); setProfile(id); setTab('dnes'); }} />;
  return (
    <div class="app">
      <div class="appbar">
        <button class="who" onClick={() => setProfile(null)} aria-label="Změnit profil">{profileMeta(profile!).emoji} {profileMeta(profile!).name} <small>▾</small></button>
        <span class="title">{TABS.find((t) => t.id === tab)!.label}</span>
      </div>
      <main>
        {tab === 'dnes' && <Today id={profile!} go={(t) => setTab(t as Tab)} />}
        {tab === 'kalendar' && <Calendar id={profile!} />}
        {tab === 'test' && <Tests id={profile!} />}
        {tab === 'rodic' && <Parent unlocked={unlocked} unlock={() => setUnlocked(true)} />}
      </main>
      <nav class="tabs">{TABS.map((t) => <button class={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-label={t.label}><span>{t.icon}</span><small>{t.label}</small></button>)}</nav>
    </div>
  );
}

function Picker({ pick, add }: { pick: (id: ProfileId) => void; add: () => void }) {
  const g = loadGlobal();
  return (
    <div class="picker">
      <h1>Doučování 🎒</h1>
      <p>Kdo se dnes bude učit?</p>
      <div class="pgrid">{g.profiles.map((pm) => (
        <button class={'pbtn' + (g.lastProfile === pm.id ? ' last' : '')} style={{ background: pm.color }} onClick={() => pick(pm.id)}>
          <span class="em">{pm.emoji}</span><b>{pm.name}</b><small>{student(pm.track).grade}. třída · 🔥 {streak(pm.id, today(), loadProfile(pm.id), g)}</small>
        </button>
      ))}
        <button class="pbtn add" onClick={add} aria-label="Přidat profil"><span class="em">＋</span><b>Přidat profil</b></button>
      </div>
      <p class="small muted">Přípravka na přijímačky CERMAT 2027 · funguje i offline</p>
    </div>
  );
}
