import { useEffect, useState } from 'preact/hooks';
import { Icon, Avatar } from './icons';
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
import { Reports, hasReports } from './Reports';

type Tab = 'dnes' | 'kalendar' | 'test' | 'rodic';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dnes', label: 'Dnes', icon: 'today' },
  { id: 'kalendar', label: 'Kalendář', icon: 'calendar' },
  { id: 'test', label: 'Test', icon: 'test' },
  { id: 'rodic', label: 'Rodič', icon: 'lock' },
];

export function App() {
  const [profile, setProfile] = useState<ProfileId | null>(() => { const q = new URLSearchParams(location.search).get('p'); return q && loadGlobal().profiles.some((x) => x.id === q) ? q : null; });
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Tab>('dnes');
  const [unlocked, setUnlocked] = useState(false);
  const [hash, setHash] = useState(location.hash);
  useEffect(() => { const f = () => setHash(location.hash); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => {
    // profile colour is only a subtle accent (avatar ring); the UI accent stays neutral
    const meta = profile ? profileMeta(profile) : null;
    document.documentElement.style.setProperty('--pcolor', meta?.color || 'var(--accent)');
  }, [profile]);
  useEffect(() => { if (tab !== 'rodic') setUnlocked(false); }, [tab]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab, profile, adding]);

  const { g } = useStore();
  if (hash.startsWith('#r=') || hash === '#prehledy') {
    return <Reports code={hash.startsWith('#r=') ? hash.slice(3) : undefined} leave={() => { history.replaceState(null, '', location.pathname + location.search); setHash(''); }} />;
  }
  const valid = profile && g.profiles.some((x) => x.id === profile);
  if (!g.profiles.length || adding) return <Setup reports={hasReports() ? () => { location.hash = '#prehledy'; } : undefined} first={!g.profiles.length} cancel={g.profiles.length ? () => setAdding(false) : undefined} done={(id) => { setAdding(false); setProfile(id); setTab('dnes'); }} />;
  if (!valid) return <Picker add={() => setAdding(true)} pick={(id) => { updateGlobal((x) => { x.lastProfile = id; }); setProfile(id); setTab('dnes'); }} />;
  return (
    <div class="app">
      <div class="appbar">
        <button class="who" onClick={() => setProfile(null)} aria-label="Změnit profil"><Avatar emoji={profileMeta(profile!).emoji} color={profileMeta(profile!).color} size={26} /><span>{profileMeta(profile!).name}</span><Icon name="chevD" size={16} /></button>
        <span class="title">{TABS.find((t) => t.id === tab)!.label}</span>
      </div>
      <main>
        {tab === 'dnes' && <Today id={profile!} go={(t) => setTab(t as Tab)} />}
        {tab === 'kalendar' && <Calendar id={profile!} />}
        {tab === 'test' && <Tests id={profile!} />}
        {tab === 'rodic' && <Parent unlocked={unlocked} unlock={() => setUnlocked(true)} />}
      </main>
      <nav class="tabs">{TABS.map((t) => <button class={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-label={t.label}><Icon name={t.icon} size={25} /><small>{t.label}</small></button>)}</nav>
    </div>
  );
}

function Picker({ pick, add }: { pick: (id: ProfileId) => void; add: () => void }) {
  const g = loadGlobal();
  return (
    <div class="picker">
      <h1>Doučování</h1>
      <p>Kdo se dnes bude učit?</p>
      <div class="pgrid">{g.profiles.map((pm) => (
        <button class={'pbtn' + (g.lastProfile === pm.id ? ' last' : '')} onClick={() => pick(pm.id)}>
          <Avatar emoji={pm.emoji} color={pm.color} size={44} /><b>{pm.name}</b><small>{student(pm.track).grade}. třída · <Icon name="flame" size={13} /> {streak(pm.id, today(), loadProfile(pm.id), g)}</small>
        </button>
      ))}
        <button class="pbtn add" onClick={add} aria-label="Přidat profil"><span class="avatar plus"><Icon name="plus" size={22} /></span><b>Přidat profil</b></button>
      </div>
      {hasReports() > 0 && <a class="link" href="#prehledy"><Icon name="chart" size={16} /> Přehledy od dětí ({hasReports()})</a>}
      <p class="small muted">Přípravka na přijímačky CERMAT 2027 · funguje i offline</p>
    </div>
  );
}
