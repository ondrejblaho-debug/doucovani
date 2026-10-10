// Shareable progress reports: a compact Snapshot compressed into the URL fragment (#r=…).
// The fragment is never sent to any server; the receiving phone decodes it locally.
import type { Snap } from './stats';

const b64u = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s: string) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
async function pipe(data: Uint8Array, stream: any): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
}
const CS = (globalThis as any).CompressionStream, DS = (globalThis as any).DecompressionStream;

export async function encodeSnap(s: Snap): Promise<string> {
  const raw = new TextEncoder().encode(JSON.stringify(s));
  for (const [fmt, tag] of [['deflate-raw', 'z'], ['deflate', 'd']] as const) {
    if (typeof CS === 'function') { try { return tag + b64u(await pipe(raw, new CS(fmt))); } catch { /* try next */ } }
  }
  return 'j' + b64u(raw);
}
export async function decodeSnap(code: string): Promise<Snap> {
  const tag = code[0], body = unb64u(code.slice(1));
  let json: string;
  if (tag === 'z' || tag === 'd') json = new TextDecoder().decode(await pipe(body, new DS(tag === 'z' ? 'deflate-raw' : 'deflate')));
  else if (tag === 'j') json = new TextDecoder().decode(body);
  else throw new Error('Neznámý formát přehledu');
  const s = JSON.parse(json) as Snap;
  if (s.v !== 1 || !s.pid || !Array.isArray(s.min)) throw new Error('Neplatný přehled');
  return s;
}

export const reportUrl = (code: string) => `${location.origin}${location.pathname}#r=${code}`;

const RKEY = 'doucovani:v1:reports';
export function loadReports(): Record<string, Snap> { try { return JSON.parse(localStorage.getItem(RKEY) || '{}'); } catch { return {}; } }
/** Saves a received report; one per child (profile id), the newest snapshot wins. Returns false if an older one was ignored. */
export function saveReport(s: Snap): boolean {
  const all = loadReports();
  const cur = all[s.pid];
  if (cur && cur.at > s.at) return false;
  all[s.pid] = s; localStorage.setItem(RKEY, JSON.stringify(all)); return true;
}
export function deleteReport(pid: string) { const all = loadReports(); delete all[pid]; localStorage.setItem(RKEY, JSON.stringify(all)); }

/** Opens the share sheet (iOS) with the report link; falls back to copying it. */
export async function shareReportLink(url: string, name: string): Promise<'shared' | 'copied' | 'manual' | 'cancelled'> {
  const nav = navigator as any;
  if (typeof nav.share === 'function') {
    try { await nav.share({ title: `Přehled učení – ${name}`, text: `Přehled učení – ${name}. Otevři odkaz v Safari:`, url }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  try { await navigator.clipboard.writeText(url); return 'copied'; } catch { return 'manual'; }
}
