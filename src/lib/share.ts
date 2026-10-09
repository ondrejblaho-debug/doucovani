// Backup: JSON export/import and a compact share code (gzip + base64url when supported).
import { loadGlobal, loadProfile, saveGlobal, saveProfile, notify, GlobalData, ProfileData } from './store';
import type { ProfileId } from './data';

export interface Backup { app: 'doucovani'; v: 1; exportedAt: string; global: GlobalData; profiles: Record<ProfileId, ProfileData> }

export const makeBackup = (): Backup => {
  const g = loadGlobal();
  return { app: 'doucovani', v: 1, exportedAt: new Date().toISOString(), global: g, profiles: Object.fromEntries(g.profiles.map((p) => [p.id, loadProfile(p.id)])) };
};

const b64u = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s: string) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

async function pipe(data: Uint8Array, stream: any): Promise<Uint8Array> {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function shareCode(): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(makeBackup()));
  if (typeof (globalThis as any).CompressionStream === 'function') {
    try { return 'DOUC1Z.' + b64u(await pipe(raw, new (globalThis as any).CompressionStream('gzip'))); } catch { /* fall back */ }
  }
  return 'DOUC1.' + b64u(raw);
}

export async function parseImport(text: string): Promise<Backup> {
  const t = text.trim().replace(/\s+/g, '');
  let json: string;
  if (t.startsWith('DOUC1Z.')) json = new TextDecoder().decode(await pipe(unb64u(t.slice(7)), new (globalThis as any).DecompressionStream('gzip')));
  else if (t.startsWith('DOUC1.')) json = new TextDecoder().decode(unb64u(t.slice(6)));
  else json = text;
  const b = JSON.parse(json) as Backup;
  if (b.app !== 'doucovani' || !b.profiles) throw new Error('Neplatná záloha');
  return b;
}

export function applyBackup(b: Backup) {
  // merge: profiles from the backup are added or replaced (by id), other profiles on this device stay
  const g = loadGlobal();
  const bg = b.global as Partial<GlobalData> | undefined;
  for (const pr of bg?.profiles || []) {
    const i = g.profiles.findIndex((x) => x.id === pr.id);
    if (i >= 0) g.profiles[i] = pr; else g.profiles.push(pr);
    g.minutes[pr.id] = bg?.minutes?.[pr.id] || g.minutes[pr.id] || {};
  }
  saveGlobal(g);
  for (const id of Object.keys(b.profiles) as ProfileId[]) if (g.profiles.some((x) => x.id === id)) saveProfile(id, b.profiles[id]);
  notify();
}
