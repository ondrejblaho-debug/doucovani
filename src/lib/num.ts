// Czech number formatting and tolerant answer parsing
export function fmt(n: number, maxDec = 6): string {
  if (!isFinite(n)) return String(n);
  const neg = n < 0;
  let s = Math.abs(n).toFixed(maxDec).replace(/\.?0+$/, '');
  let [i, d] = s.split('.');
  if (i.length >= 4) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return (neg ? '−' : '') + i + (d ? ',' + d : '');
}
export function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
export function lcm(a: number, b: number): number { return (a / gcd(a, b)) * b; }
export function frac(n: number, d: number): string {
  if (d < 0) { n = -n; d = -d; }
  return (n < 0 ? '−' : '') + Math.abs(n) + '/' + d;
}
export function normalizeAnswer(s: string): string {
  return s
    .replace(/[\s\u00a0\u202f]+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/∶/g, ':')
    .replace(/,/g, '.')
    .toLowerCase();
}
/** Parses "12,5", "−3", "1 200", "3/4", "-3/4", "1 1/2" (mixed). Returns NaN on failure. */
export function parseNum(s: string): number {
  const raw = s.trim().replace(/[−–—]/g, '-').replace(/\u00a0|\u202f/g, ' ');
  const mixed = raw.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) { const v = Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]); return mixed[1] ? -v : v; }
  const t = raw.replace(/\s+/g, '').replace(',', '.');
  const f = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) { const d = Number(f[2]); return d === 0 ? NaN : Number(f[1]) / d; }
  if (!/^-?\d+(\.\d+)?$/.test(t) && !/^-?\.\d+$/.test(t)) return NaN;
  return Number(t);
}
