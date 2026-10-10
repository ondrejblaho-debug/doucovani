import { useEffect, useRef, useState } from 'preact/hooks';
import { subscribe, loadProfile, loadGlobal } from '../lib/store';
import type { ProfileId } from '../lib/data';
import type { ComponentChildren } from 'preact';

/** Focus mode (active lesson / mock test): hides the app bar + tab bar; screens show their own top close/back control and a fixed bottom action bar. */
export function useFocusMode(on = true) {
  useEffect(() => {
    if (!on) return;
    const el = document.documentElement;
    el.classList.add('focus');
    return () => el.classList.remove('focus');
  }, [on]);
}
/** Fixed bottom bar for the screen's primary action (full width, respects the home-indicator safe area). */
export function ActionBar({ children }: { children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { // content padding follows the real bar height (e.g. wrapped labels on small phones)
    const el = ref.current; if (!el) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--ab-h', el.offsetHeight + 'px');
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null; ro?.observe(el);
    return () => { ro?.disconnect(); root.style.removeProperty('--ab-h'); };
  }, []);
  return <div class="actionbar" ref={ref}><div class="actionbar-in">{children}</div></div>;
}

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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" stroke-width="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} stroke-width="5" stroke-linecap="round" stroke-dasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size={size / 4.2} font-weight="600" fill="currentColor">{label ?? Math.round(v * 100) + '%'}</text>
    </svg>
  );
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const SUBJ_LABEL: Record<string, string> = { matematika: 'Matematika', cestina: 'Čeština', extra: 'Navíc', skola: 'Navíc (školní test)', anglictina: 'Angličtina', review: 'Opakování' };
