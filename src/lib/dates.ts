// Local-date helpers. Dates are 'YYYY-MM-DD' strings in the device's local time zone.
export const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k: string, n: number) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
export const diffDays = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
export const WD = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'] as const;
export const wdShort = (k: string) => WD[fromKey(k).getDay()];
export const isSunday = (k: string) => fromKey(k).getDay() === 0;
const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
export const MONTHS_NOM = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const WD_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const fmtLong = (k: string) => { const d = fromKey(k); return `${WD_LONG[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`; };
export const fmtShort = (k: string) => { const d = fromKey(k); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
export const fmtFull = (k: string) => { const d = fromKey(k); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

/** "today" – can be overridden for testing via ?today=YYYY-MM-DD or localStorage 'doucovani:today' */
export function today(): string {
  try {
    const q = new URLSearchParams(location.search).get('today');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    const s = localStorage.getItem('doucovani:today');
    if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch { /* ignore */ }
  return toKey(new Date());
}
