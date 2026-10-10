// Minimal line icons (inline SVG, bundled – no CDN). 24×24 grid, stroke = currentColor.
import type { JSX } from 'preact';

const P: Record<string, JSX.Element> = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  test: <><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  chevL: <path d="M15 5l-7 7 7 7" />,
  chevR: <path d="M9 5l7 7-7 7" />,
  chevD: <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  flame: <path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.6-5 3.6-8.4.9 1.5 1.9 2.4 2.8 2.9.3-2 1.2-3.8 2.6-5.4.4 3.2 3 5.4 3 9.2C18 18.6 15.6 21 12 21z" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  slow: <><path d="M4 16h11a4 4 0 0 0 4-4V9" /><circle cx="19" cy="7" r="1.8" /><path d="M6 16a5 5 0 0 1 10 0" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /></>,
  headphones: <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3.5" y="14" width="4" height="6.5" rx="1.5" /><rect x="16.5" y="14" width="4" height="6.5" rx="1.5" /></>,
  repeat: <><path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3" /></>,
  pin: <><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M7 7l10 10M17 7L7 17" />,
  arrowR: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  key: <><circle cx="8" cy="14" r="4" /><path d="M11 11l8.5-8.5M16 6l2.5 2.5M14 8l2 2" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  folder: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  cap: <><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c1.5 1.5 3.5 2.2 5.5 2.2s4-.7 5.5-2.2v-4.5" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></>,
  flag: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  backspace: <><path d="M8.5 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8.5L3 12z" /><path d="M11.5 9.5l5 5M16.5 9.5l-5 5" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21" /></>,
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 20, class: cls = '', label }: { name: string; size?: number; class?: string; label?: string }) {
  return (
    <svg class={'ic ' + cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined}>{P[name]}</svg>
  );
}
/** Small profile avatar: emoji in a neutral circle with a thin ring in the profile colour. */
export function Avatar({ emoji, color, size = 28 }: { emoji: string; color: string; size?: number }) {
  return <span class="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.55), boxShadow: `0 0 0 1.5px ${color}` }}>{emoji}</span>;
}
