import { useEffect, useState } from 'preact/hooks';
import { subscribe, loadProfile, loadGlobal } from '../lib/store';
import type { ProfileId } from '../lib/data';

export function useStore(id?: ProfileId) {
  const [, setN] = useState(0);
  useEffect(() => subscribe(() => setN((n) => n + 1)), []);
  return { p: id ? loadProfile(id) : null, g: loadGlobal() };
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export function Ring({ value, size = 56, color, label }: { value: number; size?: number; color: string; label?: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} class="ring" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e8ef" stroke-width="6" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-width="6" stroke-linecap="round" stroke-dasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size={size / 4.2} font-weight="700" fill="#333">{label ?? Math.round(v * 100) + '%'}</text>
    </svg>
  );
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const SUBJ_LABEL: Record<string, string> = { matematika: 'Matematika', cestina: 'Čeština', extra: 'Navíc', skola: 'Navíc (školní test)', anglictina: 'Angličtina', review: 'Opakování' };
