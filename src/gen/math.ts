// Parameterized math task generators – practice never runs out.
import type { Task } from '../lib/types';
import { Rng, ri, pick, shuffle, mulberry32 } from '../lib/rng';
import { fmt, gcd, lcm, frac } from '../lib/num';

export interface Generator { id: string; topic: string; grade: 5 | 7; diff: 1 | 2 | 3; make: (r: Rng) => Omit<Task, 'id' | 'topic' | 'grade' | 'subject' | 'gen' | 'diff'> }

const numT = (prompt: string, answer: number | string, explain: string, unit?: string, meta?: Record<string, unknown>, extra: Partial<Task> = {}) =>
  ({ kind: 'num' as const, prompt, answers: [typeof answer === 'number' ? fmt(answer) : answer], explain, unit, meta, ...extra });

function mcNum(prompt: string, correct: number, distract: number[], explain: string, f: (n: number) => string = fmt, r?: Rng, meta?: Record<string, unknown>) {
  const seen = new Set([f(correct)]);
  const d: string[] = [];
  for (const x of distract) { const s = f(x); if (!seen.has(s) && isFinite(x)) { seen.add(s); d.push(s); } if (d.length === 3) break; }
  let k = 1;
  while (d.length < 3) { const s = f(correct + k * (k % 2 ? 1 : -1) * Math.max(1, Math.round(Math.abs(correct) * 0.1))); if (!seen.has(s)) { seen.add(s); d.push(s); } k++; }
  const opts = r ? shuffle(r, [f(correct), ...d]) : [f(correct), ...d];
  return { kind: 'mc' as const, prompt, options: opts, correct: opts.indexOf(f(correct)), explain, meta };
}

// ---------- shared word lists ----------
/** Czech plural: 1 → one, 2–4 → few, else many */
export const pl = (n: number, one: string, few: string, many: string) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const NAMES_F = ['Ema', 'Jana', 'Klára', 'Bára', 'Lucie', 'Tereza', 'Eliška', 'Anna', 'Sofie', 'Karolína'];
const NAMES_M = ['Tom', 'Jakub', 'Adam', 'Matěj', 'Vojta', 'Filip', 'Ondra', 'Petr', 'David', 'Šimon'];

export const GENERATORS: Generator[] = [
  // ============ GRADE 5 ============
  { id: 'm5-poradi', topic: 'm5-pocetni-operace', grade: 5, diff: 1, make: (r) => {
    const t = ri(r, 0, 3);
    const a = ri(r, 2, 30), b = ri(r, 2, 9), c = ri(r, 2, 9);
    if (t === 0) { const v = a + b * c; return numT(`Vypočítej: ${a} + ${b} · ${c}`, v, `Nejdřív násobíme: ${b} · ${c} = ${b * c}, pak sčítáme: ${a} + ${b * c} = ${v}.`, undefined, { expr: `${a}+${b}*${c}` }); }
    if (t === 1) { const v = (a + b) * c; return numT(`Vypočítej: (${a} + ${b}) · ${c}`, v, `Nejdřív závorka: ${a} + ${b} = ${a + b}, pak ${a + b} · ${c} = ${v}.`, undefined, { expr: `(${a}+${b})*${c}` }); }
    if (t === 2) { const p = b * c + ri(r, 1, 20); const v = p - b * c; return numT(`Vypočítej: ${p} − ${b} · ${c}`, v, `Nejdřív násobíme: ${b} · ${c} = ${b * c}, pak ${p} − ${b * c} = ${v}.`, undefined, { expr: `${p}-${b}*${c}` }); }
    const d = b * c; const v = a + d / b; return numT(`Vypočítej: ${a} + ${d} : ${b}`, v, `Dělení má přednost: ${d} : ${b} = ${c}, pak ${a} + ${c} = ${v}.`, undefined, { expr: `${a}+${d}/${b}` });
  } },
  { id: 'm5-nasob10', topic: 'm5-pocetni-operace', grade: 5, diff: 1, make: (r) => {
    const a = ri(r, 3, 999), k = pick(r, [10, 100, 1000]);
    if (r() < 0.5) return numT(`Vypočítej: ${fmt(a)} · ${fmt(k)}`, a * k, `Násobíme ${fmt(k)}: připíšeme ${String(k).length - 1} ${pl(String(k).length - 1, 'nulu', 'nuly', 'nul')}: ${fmt(a * k)}.`, undefined, { expr: `${a}*${k}` });
    const p = a * k; return numT(`Vypočítej: ${fmt(p)} : ${fmt(k)}`, a, `Dělíme ${fmt(k)}: ubereme ${String(k).length - 1} ${pl(String(k).length - 1, 'nulu', 'nuly', 'nul')}: ${fmt(a)}.`, undefined, { expr: `${p}/${k}` });
  } },
  { id: 'm5-zpameti', topic: 'm5-pocetni-operace', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 2, 9) * 10 + ri(r, 1, 9), b = ri(r, 2, 9);
    const t = ri(r, 0, 2);
    if (t === 0) { const v = a * b; return numT(`Vypočítej zpaměti: ${a} · ${b}`, v, `Rozložíme: ${Math.floor(a / 10) * 10} · ${b} + ${a % 10} · ${b} = ${Math.floor(a / 10) * 10 * b} + ${(a % 10) * b} = ${v}.`, undefined, { expr: `${a}*${b}` }); }
    if (t === 1) { const x = ri(r, 2, 9), y = ri(r, 2, 9), z = ri(r, 2, 9); const v = x * y * z * 10; return numT(`Vypočítej: ${x} · ${y * 10} · ${z}`, v, `${x} · ${y * 10} = ${x * y * 10}, pak · ${z} = ${v}.`, undefined, { expr: `${x}*${y * 10}*${z}` }); }
    const x = ri(r, 101, 899), y = ri(r, 101, 899); const v = x + y; return numT(`Vypočítej: ${x} + ${y}`, v, `Sčítáme po řádech: ${v}.`, undefined, { expr: `${x}+${y}` });
  } },
  { id: 'm5-zavorky2', topic: 'm5-pocetni-operace', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 10, 60), b = ri(r, 2, 9), c = ri(r, 2, 6), d = ri(r, 1, 9);
    const inner = a - b * c; if (inner <= 0) return numT(`Vypočítej: ${a} + ${b} · ${c}`, a + b * c, `Nejdřív násobíme, pak sčítáme.`, undefined, { expr: `${a}+${b}*${c}` });
    const v = inner * d + d; return numT(`Vypočítej: (${a} − ${b} · ${c}) · ${d} + ${d}`, v, `V závorce nejdřív násobíme: ${b} · ${c} = ${b * c}, ${a} − ${b * c} = ${inner}. Pak ${inner} · ${d} = ${inner * d} a + ${d} = ${v}.`, undefined, { expr: `(${a}-${b}*${c})*${d}+${d}` });
  } },
  { id: 'm5-pisemne-scit', topic: 'm5-pisemne-algoritmy', grade: 5, diff: 1, make: (r) => {
    const a = ri(r, 1000, 89999), b = ri(r, 1000, 9999);
    if (r() < 0.5) return numT(`Vypočítej písemně: ${fmt(a)} + ${fmt(b)}`, a + b, `Sčítáme pod sebou od jednotek: ${fmt(a + b)}. Zkouška: ${fmt(a + b)} − ${fmt(b)} = ${fmt(a)}.`, undefined, { expr: `${a}+${b}` });
    const big = Math.max(a, b), small = Math.min(a, b);
    return numT(`Vypočítej písemně: ${fmt(big)} − ${fmt(small)}`, big - small, `Odčítáme pod sebou: ${fmt(big - small)}. Zkouška: ${fmt(big - small)} + ${fmt(small)} = ${fmt(big)}.`, undefined, { expr: `${big}-${small}` });
  } },
  { id: 'm5-pisemne-nasob', topic: 'm5-pisemne-algoritmy', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 101, 999), b = ri(r, 12, 99);
    return numT(`Vypočítej písemně: ${a} · ${b}`, a * b, `${a} · ${b % 10} = ${a * (b % 10)}, ${a} · ${Math.floor(b / 10)}0 = ${fmt(a * Math.floor(b / 10) * 10)}; součet = ${fmt(a * b)}.`, undefined, { expr: `${a}*${b}` });
  } },
  { id: 'm5-pisemne-del', topic: 'm5-pisemne-algoritmy', grade: 5, diff: 2, make: (r) => {
    const d = r() < 0.6 ? ri(r, 3, 9) : ri(r, 12, 25); const q = ri(r, 21, 999);
    return numT(`Vypočítej písemně: ${fmt(q * d)} : ${d}`, q, `${fmt(q * d)} : ${d} = ${q}. Zkouška: ${q} · ${d} = ${fmt(q * d)}.`, undefined, { expr: `${q * d}/${d}` });
  } },
  { id: 'm5-delzbytek', topic: 'm5-pisemne-algoritmy', grade: 5, diff: 2, make: (r) => {
    const d = ri(r, 3, 9), q = ri(r, 10, 99), z = ri(r, 1, d - 1); const n = q * d + z;
    return numT(`Jaký je zbytek po dělení ${n} : ${d}?`, z, `${n} = ${q} · ${d} + ${z}, zbytek je ${z}.`, undefined, { expr: `${n}%${d}` });
  } },
  { id: 'm5-zaokrouhli', topic: 'm5-cisla-do-milionu', grade: 5, diff: 1, make: (r) => {
    const n = ri(r, 1001, 999999); const k = pick(r, [10, 100, 1000]);
    const v = Math.round(n / k) * k; const name = k === 10 ? 'desítky' : k === 100 ? 'stovky' : 'tisíce';
    return numT(`Zaokrouhli číslo ${fmt(n)} na ${name}.`, v, `Rozhoduje číslice za zaokrouhlovaným řádem (${Math.floor((n % k) / (k / 10))}): ${Math.floor((n % k) / (k / 10)) >= 5 ? 'je 5 nebo víc – zaokrouhlíme nahoru' : 'je menší než 5 – zaokrouhlíme dolů'}. Výsledek ${fmt(v)}.`, undefined, { n, k });
  } },
  { id: 'm5-rozvinuty', topic: 'm5-cisla-do-milionu', grade: 5, diff: 1, make: (r) => {
    const ds = [ri(r, 1, 9), ri(r, 0, 9), ri(r, 0, 9), ri(r, 0, 9), ri(r, 0, 9), ri(r, 0, 9)];
    const pw = [100000, 10000, 1000, 100, 10, 1]; const v = ds.reduce((s, d, i) => s + d * pw[i], 0);
    const parts = ds.map((d, i) => (d ? `${d} · ${fmt(pw[i])}` : '')).filter(Boolean).join(' + ');
    return numT(`Které číslo je zapsáno rozvinutým zápisem? ${parts}`, v, `Sečteme jednotlivé řády: ${fmt(v)}.`, undefined, { v });
  } },
  { id: 'm5-porovnej', topic: 'm5-cisla-do-milionu', grade: 5, diff: 1, make: (r) => {
    const a = ri(r, 10000, 999999); const b = a + pick(r, [-1, 1]) * pick(r, [9, 90, 900, 9000, 1]);
    const opts = ['<', '>', '='];
    const c = a < b ? 0 : a > b ? 1 : 2;
    return { kind: 'mc' as const, prompt: `Porovnej: ${fmt(a)} ☐ ${fmt(b)}`, options: opts, correct: c, explain: `Porovnáváme řád po řádu zleva: ${fmt(a)} ${opts[c]} ${fmt(b)}.`, meta: { a, b } };
  } },
  { id: 'm5-cislicova-osa', topic: 'm5-cisla-do-milionu', grade: 5, diff: 2, make: (r) => {
    const step = pick(r, [10, 50, 100, 250, 500, 1000]); const start = ri(r, 0, 20) * step; const k = ri(r, 2, 7);
    return numT(`Na číselné ose jsou vyznačena čísla ${fmt(start)} a ${fmt(start + step)}, dílky jsou stejně velké. Jaké číslo leží o ${k} dílků dál za číslem ${fmt(start)}?`, start + k * step, `Jeden dílek je ${fmt(step)}, ${k} dílků je ${fmt(k * step)}: ${fmt(start)} + ${fmt(k * step)} = ${fmt(start + k * step)}.`);
  } },
  { id: 'm5-slovni-okolik', topic: 'm5-slovni-ulohy', grade: 5, diff: 1, make: (r) => {
    const n1 = pick(r, NAMES_F), n2 = pick(r, NAMES_M); const a = ri(r, 12, 60), d = ri(r, 3, 25);
    const t = ri(r, 0, 2);
    if (t === 0) return numT(`${n1} má ${a} samolepek. ${n2} má o ${d} samolepek více. Kolik samolepek mají dohromady?`, a + a + d, `${n2} má ${a} + ${d} = ${a + d}. Dohromady ${a} + ${a + d} = ${2 * a + d}.`, undefined, { count: true });
    if (t === 1) { const k = ri(r, 2, 5); return numT(`${n1} má ${a} kuliček, ${n2} má ${k}krát více. Kolik kuliček má ${n2}?`, a * k, `${k}krát více: ${a} · ${k} = ${a * k}.`, undefined, { count: true }); }
    const k = ri(r, 2, 6); const b = a * k; return numT(`Kniha stojí ${b} Kč, sešit je ${k}krát levnější. Kolik stojí sešit?`, a, `${k}krát méně: ${b} : ${k} = ${a} Kč.`, 'Kč');
  } },
  { id: 'm5-slovni-nakup', topic: 'm5-slovni-ulohy', grade: 5, diff: 2, make: (r) => {
    const n = pick(r, NAMES_F); const p1 = ri(r, 12, 45), c1 = ri(r, 2, 5), p2 = ri(r, 8, 30), c2 = ri(r, 2, 4);
    const total = p1 * c1 + p2 * c2; const pay = Math.ceil((total + 1) / 100) * 100;
    return numT(`${n} koupila ${c1} ${pl(c1, 'sešit', 'sešity', 'sešitů')} po ${p1} Kč a ${c2} tužky po ${p2} Kč. Zaplatila ${pay} Kč. Kolik korun jí vrátili?`, pay - total, `Sešity: ${c1} · ${p1} = ${c1 * p1} Kč, tužky: ${c2} · ${p2} = ${c2 * p2} Kč, celkem ${total} Kč. Vrátí: ${pay} − ${total} = ${pay - total} Kč.`, 'Kč');
  } },
  { id: 'm5-slovni-rozdel', topic: 'm5-slovni-ulohy', grade: 5, diff: 2, make: (r) => {
    const per = ri(r, 3, 9), groups = ri(r, 4, 12), extra = ri(r, 1, per - 1); const total = per * groups + extra;
    return numT(`Paní učitelka rozdává ${total} bonbonů. Každé dítě dostane ${per} ${pl(per, 'bonbon', 'bonbony', 'bonbonů')} a ${extra} ${pl(extra, 'bonbon zbude', 'bonbony zbudou', 'bonbonů zbude')}. Kolik je dětí?`, groups, `Rozdané bonbony: ${total} − ${extra} = ${total - extra}. Počet dětí: ${total - extra} : ${per} = ${groups}.`, undefined, { count: true });
  } },
  { id: 'm5-slovni-dvoukrok', topic: 'm5-slovni-ulohy', grade: 5, diff: 3, make: (r) => {
    const a = ri(r, 3, 9) * 10; const d = ri(r, 2, 9) * 2; const b = a + d;
    const total = a + b;
    return numT(`Dva bratři mají dohromady ${total} Kč. Starší má o ${d} Kč více než mladší. Kolik Kč má mladší bratr?`, a, `Odečteme rozdíl: ${total} − ${d} = ${total - d} Kč – to jsou dvě stejné části. Mladší má ${total - d} : 2 = ${a} Kč (starší ${a} + ${d} = ${b} Kč).`, 'Kč');
  } },
  { id: 'm5-zlomek-cast', topic: 'm5-zlomky', grade: 5, diff: 1, make: (r) => {
    const d = pick(r, [2, 3, 4, 5, 6, 8, 10]); const k = ri(r, 2, 12); const n = d * k; const names: Record<number, string> = { 2: 'polovina', 3: 'třetina', 4: 'čtvrtina', 5: 'pětina', 6: 'šestina', 8: 'osmina', 10: 'desetina' };
    return numT(`Kolik je ${names[d]} z čísla ${n}?`, k, `${names[d]} = 1/${d}, tedy ${n} : ${d} = ${k}.`, undefined, { n, d });
  } },
  { id: 'm5-zlomek-zcisla', topic: 'm5-zlomky', grade: 5, diff: 2, make: (r) => {
    const d = pick(r, [3, 4, 5, 6, 8, 10]); const c = ri(r, 2, d - 1); const k = ri(r, 2, 10); const n = d * k;
    return numT(`Kolik je ${c}/${d} z ${n}?`, c * k, `1/${d} z ${n} je ${n} : ${d} = ${k}, ${c}/${d} je ${c} · ${k} = ${c * k}.`, undefined, { n, c, d });
  } },
  { id: 'm5-zlomek-scit', topic: 'm5-zlomky', grade: 5, diff: 1, make: (r) => {
    const d = ri(r, 5, 12); const a = ri(r, 1, d - 2), b = ri(r, 1, d - a - 1);
    if (r() < 0.5) return numT(`Vypočítej: ${a}/${d} + ${b}/${d} (výsledek zapiš jako zlomek se jmenovatelem ${d})`, `${a + b}/${d}`, `Jmenovatel zůstává, čitatele sečteme: ${a} + ${b} = ${a + b} → ${a + b}/${d}.`, undefined, { a, b, d, op: '+' }, { strict: true, answers: [`${a + b}/${d}`] });
    const big = a + b; return numT(`Vypočítej: ${big}/${d} − ${b}/${d} (výsledek zapiš jako zlomek se jmenovatelem ${d})`, `${a}/${d}`, `Jmenovatel zůstává, čitatele odečteme: ${big} − ${b} = ${a} → ${a}/${d}.`, undefined, { a: big, b, d, op: '-' }, { strict: true, answers: [`${a}/${d}`] });
  } },
  { id: 'm5-opolovinu', topic: 'm5-zlomky', grade: 5, diff: 2, make: (r) => {
    const n = ri(r, 3, 40) * 2; if (r() < 0.5) return numT(`Které číslo je o polovinu větší než ${n}?`, n + n / 2, `Polovina z ${n} je ${n / 2}, ${n} + ${n / 2} = ${n + n / 2}.`);
    return numT(`Které číslo je o polovinu menší než ${n}?`, n / 2, `Polovina z ${n} je ${n / 2}, ${n} − ${n / 2} = ${n / 2}.`);
  } },
  { id: 'm5-teplomer', topic: 'm5-desetinna-zaporna', grade: 5, diff: 1, make: (r) => {
    const t0 = ri(r, -8, 6), dt = ri(r, 2, 12); const up = r() < 0.5; const t1 = up ? t0 + dt : t0 - dt;
    return numT(`Ráno teploměr ukazoval ${fmt(t0)} °C. Během dne se ${up ? 'oteplilo' : 'ochladilo'} o ${dt} °C. Kolik stupňů ukazoval teploměr potom?`, t1, `${fmt(t0)} ${up ? '+' : '−'} ${dt} = ${fmt(t1)} °C. Na teploměru se posuneme o ${dt} ${pl(dt, 'dílek', 'dílky', 'dílků')} ${up ? 'nahoru' : 'dolů'}.`, '°C');
  } },
  { id: 'm5-desetinne-porovnej', topic: 'm5-desetinna-zaporna', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 1, 99) / 100, b = ri(r, 1, 9) / 10; if (Math.abs(a - b) < 1e-9) return { kind: 'yn' as const, prompt: `Platí, že ${fmt(a)} = ${fmt(b)}?`, answer: true, explain: `Obě čísla jsou stejná.` };
    const big = Math.max(a, b);
    return { kind: 'mc' as const, prompt: `Které číslo je větší: ${fmt(a)}, nebo ${fmt(b)}?`, options: [fmt(a), fmt(b)], correct: a > b ? 0 : 1, explain: `Porovnáme desetiny: ${fmt(a)} = ${fmt(Math.round(a * 100))} setin, ${fmt(b)} = ${fmt(Math.round(b * 100))} setin. Větší je ${fmt(big)}.`, meta: { a, b } };
  } },
  { id: 'm5-desetinne-osa', topic: 'm5-desetinna-zaporna', grade: 5, diff: 2, make: (r) => {
    const w = ri(r, 0, 5), k = ri(r, 1, 9); const v = w + k / 10;
    return numT(`Úsečka mezi čísly ${w} a ${w + 1} na číselné ose je rozdělena na 10 stejných dílků. Jaké číslo leží na ${k}. dílku od čísla ${w}? (zapiš desetinné číslo)`, v, `Jeden dílek je 0,1. ${w} + ${k} · 0,1 = ${fmt(v)}.`);
  } },
  { id: 'm5-jednotky-delka', topic: 'm5-jednotky', grade: 5, diff: 1, make: (r) => {
    const conv = pick(r, [['m', 'cm', 100], ['km', 'm', 1000], ['cm', 'mm', 10], ['m', 'mm', 1000], ['dm', 'cm', 10], ['m', 'dm', 10]] as [string, string, number][]);
    const v = ri(r, 2, 90); if (r() < 0.5) return numT(`Převeď: ${v} ${conv[0]} = ? ${conv[1]}`, v * conv[2], `1 ${conv[0]} = ${fmt(conv[2])} ${conv[1]}, tedy ${v} · ${fmt(conv[2])} = ${fmt(v * conv[2])} ${conv[1]}.`, conv[1]);
    return numT(`Převeď: ${fmt(v * conv[2])} ${conv[1]} = ? ${conv[0]}`, v, `1 ${conv[0]} = ${fmt(conv[2])} ${conv[1]}, tedy ${fmt(v * conv[2])} : ${fmt(conv[2])} = ${v} ${conv[0]}.`, conv[0]);
  } },
  { id: 'm5-jednotky-hmot', topic: 'm5-jednotky', grade: 5, diff: 1, make: (r) => {
    const conv = pick(r, [['kg', 'g', 1000], ['t', 'kg', 1000], ['kg', 'dkg', 100], ['dkg', 'g', 10]] as [string, string, number][]);
    const v = ri(r, 2, 40); return numT(`Převeď: ${v} ${conv[0]} = ? ${conv[1]}`, v * conv[2], `1 ${conv[0]} = ${fmt(conv[2])} ${conv[1]}: ${v} · ${fmt(conv[2])} = ${fmt(v * conv[2])}.`, conv[1]);
  } },
  { id: 'm5-jednotky-obsah', topic: 'm5-jednotky', grade: 5, diff: 2, make: (r) => {
    const conv = pick(r, [['m²', 'dm²', 100], ['dm²', 'cm²', 100], ['m²', 'cm²', 10000], ['km²', 'ha', 100], ['ha', 'a', 100], ['a', 'm²', 100]] as [string, string, number][]);
    const v = ri(r, 2, 30); return numT(`Převeď: ${v} ${conv[0]} = ? ${conv[1]}`, v * conv[2], `U obsahu je převodní číslo druhou mocninou: 1 ${conv[0]} = ${fmt(conv[2])} ${conv[1]}. ${v} · ${fmt(conv[2])} = ${fmt(v * conv[2])}.`, conv[1]);
  } },
  { id: 'm5-jednotky-smisene', topic: 'm5-jednotky', grade: 5, diff: 2, make: (r) => {
    const m = ri(r, 1, 9), cm = ri(r, 1, 99); return numT(`Kolik centimetrů je ${m} m ${cm} cm?`, m * 100 + cm, `${m} m = ${m * 100} cm, + ${cm} cm = ${m * 100 + cm} cm.`, 'cm');
  } },
  { id: 'm5-cas-prevod', topic: 'm5-cas', grade: 5, diff: 1, make: (r) => {
    const t = ri(r, 0, 3);
    if (t === 0) { const h = ri(r, 2, 9); return numT(`Převeď ${h} h na minuty.`, h * 60, `1 h = 60 min, ${h} · 60 = ${h * 60} min.`, 'min'); }
    if (t === 1) { const h = ri(r, 1, 4), m = ri(r, 5, 55); return numT(`Převeď ${h} h ${m} min na minuty.`, h * 60 + m, `${h} · 60 + ${m} = ${h * 60 + m} min.`, 'min'); }
    if (t === 2) { const d = ri(r, 2, 6); return numT(`Kolik hodin ${pl(d, 'má', 'mají', 'má')} ${d} ${pl(d, 'den', 'dny', 'dní')}?`, d * 24, `1 den = 24 h, ${d} · 24 = ${d * 24} h.`, 'h'); }
    const m = ri(r, 2, 10); return numT(`Převeď ${m} min na sekundy.`, m * 60, `1 min = 60 s, ${m} · 60 = ${m * 60} s.`, 's');
  } },
  { id: 'm5-cas-doba', topic: 'm5-cas', grade: 5, diff: 2, make: (r) => {
    const h1 = ri(r, 6, 15), m1 = pick(r, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]); const dur = ri(r, 25, 200);
    const end = h1 * 60 + m1 + dur; const h2 = Math.floor(end / 60), m2 = end % 60;
    const pad = (x: number) => String(x).padStart(2, '0');
    if (r() < 0.5) return numT(`Vlak odjel v ${h1}.${pad(m1)} a přijel v ${h2}.${pad(m2)}. Kolik minut jel?`, dur, `Od ${h1}.${pad(m1)} do ${h2}.${pad(m2)}: ${Math.floor(dur / 60)} h ${dur % 60} min = ${dur} min.`, 'min');
    return { ...numT(`Film začíná v ${h1}.${pad(m1)} a trvá ${dur} minut. V kolik hodin skončí? (zapiš ve tvaru h.mm)`, `${h2}.${pad(m2)}`, `${dur} min = ${Math.floor(dur / 60)} h ${dur % 60} min. ${h1}.${pad(m1)} + ${Math.floor(dur / 60)} h ${dur % 60} min = ${h2}.${pad(m2)}.`), strict: true, answers: [`${h2}.${pad(m2)}`, `${h2}:${pad(m2)}`] };
  } },
  { id: 'm5-kalendar', topic: 'm5-cas', grade: 5, diff: 2, make: (r) => {
    const days = ['pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota', 'neděle']; const d0 = ri(r, 0, 6), add = ri(r, 3, 40);
    const idx = (d0 + add) % 7; const opts = days.slice(); 
    return { kind: 'mc' as const, prompt: `Dnes je ${days[d0]}. Jaký den bude za ${add} dní?`, options: opts, correct: idx, explain: `Týden má 7 dní. ${add} = ${Math.floor(add / 7)} · 7 + ${add % 7}, posuneme se o ${add % 7} ${pl(add % 7, 'den', 'dny', 'dní')}: ${days[idx]}.`, meta: { d0, add } };
  } },
  { id: 'm5-tabulka', topic: 'm5-data-tabulky', grade: 5, diff: 1, make: (r) => {
    const fr = shuffle(r, [['jablka', 'jablek'], ['hrušky', 'hrušek'], ['švestky', 'švestek'], ['meruňky', 'meruněk'], ['třešně', 'třešní']] as [string, string][]).slice(0, 4); const items = fr.map((f) => f[0]); const vals = items.map(() => ri(r, 3, 40));
    const table = items.map((it, i) => `${it}: ${vals[i]} kg`).join('\n');
    const t = ri(r, 0, 2);
    if (t === 0) return numT(`Tabulka ukazuje, kolik kg ovoce prodal stánek za den:\n${table}\nKolik kg ovoce prodal celkem?`, vals.reduce((a, b) => a + b, 0), `Sečteme: ${vals.join(' + ')} = ${vals.reduce((a, b) => a + b, 0)} kg.`, 'kg');
    if (t === 1) { const i = 0, j = 1; return numT(`Tabulka ukazuje, kolik kg ovoce prodal stánek za den:\n${table}\nO kolik kg ${vals[i] >= vals[j] ? 'více' : 'méně'} se prodalo ${fr[i][1]} než ${fr[j][1]}?`, Math.abs(vals[i] - vals[j]), `|${vals[i]} − ${vals[j]}| = ${Math.abs(vals[i] - vals[j])} kg.`, 'kg'); }
    const mx = Math.max(...vals); const k = vals.indexOf(mx); if (vals.filter((v) => v === mx).length > 1) return numT(`Tabulka:\n${table}\nKolik kg bylo nejvíce prodaného ovoce?`, mx, `Největší hodnota je ${mx}.`, 'kg');
    return { kind: 'mc' as const, prompt: `Tabulka ukazuje, kolik kg ovoce prodal stánek za den:\n${table}\nKterého ovoce se prodalo nejvíce?`, options: items, correct: k, explain: `Největší číslo v tabulce je ${mx} kg (${items[k]}).` };
  } },
  { id: 'm5-diagram', topic: 'm5-data-tabulky', grade: 5, diff: 2, make: (r) => {
    const days = ['Po', 'Út', 'St', 'Čt', 'Pá']; const vals = days.map(() => ri(r, 1, 12) * 5);
    const bar = days.map((d, i) => `${d}: ${'▇'.repeat(vals[i] / 5)} ${vals[i]}`).join('\n');
    return numT(`Sloupcový diagram ukazuje, kolik minut četla Ema každý den:\n${bar}\nKolik minut četla za celý týden (Po–Pá)?`, vals.reduce((a, b) => a + b, 0), `Sečteme: ${vals.join(' + ')} = ${vals.reduce((a, b) => a + b, 0)} min.`, 'min');
  } },
  { id: 'm5-obdelnik', topic: 'm5-obvod-obsah', grade: 5, diff: 1, make: (r) => {
    const a = ri(r, 2, 20), b = ri(r, 2, 15);
    if (r() < 0.5) return numT(`Obdélník má strany ${a} cm a ${b} cm. Jaký je jeho obvod?`, 2 * (a + b), `o = 2 · (a + b) = 2 · (${a} + ${b}) = ${2 * (a + b)} cm.`, 'cm', { a, b, f: 'o' });
    return numT(`Obdélník má strany ${a} cm a ${b} cm. Jaký je jeho obsah?`, a * b, `S = a · b = ${a} · ${b} = ${a * b} cm².`, 'cm²', { a, b, f: 'S' });
  } },
  { id: 'm5-ctverec', topic: 'm5-obvod-obsah', grade: 5, diff: 1, make: (r) => {
    const a = ri(r, 2, 15); const t = ri(r, 0, 2);
    if (t === 0) return numT(`Čtverec má stranu ${a} cm. Jaký je jeho obvod?`, 4 * a, `o = 4 · a = 4 · ${a} = ${4 * a} cm.`, 'cm');
    if (t === 1) return numT(`Čtverec má stranu ${a} cm. Jaký je jeho obsah?`, a * a, `S = a · a = ${a} · ${a} = ${a * a} cm².`, 'cm²');
    return numT(`Obvod čtverce je ${4 * a} cm. Jak dlouhá je jeho strana?`, a, `a = o : 4 = ${4 * a} : 4 = ${a} cm.`, 'cm');
  } },
  { id: 'm5-obdelnik-zpet', topic: 'm5-obvod-obsah', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 3, 15), b = ri(r, 2, 12);
    if (r() < 0.5) return numT(`Obdélník má obsah ${a * b} cm² a jedna strana měří ${a} cm. Jak dlouhá je druhá strana?`, b, `b = S : a = ${a * b} : ${a} = ${b} cm.`, 'cm');
    return numT(`Obvod obdélníku je ${2 * (a + b)} cm, jedna strana měří ${a} cm. Jak dlouhá je druhá strana?`, b, `a + b = ${2 * (a + b)} : 2 = ${a + b}, b = ${a + b} − ${a} = ${b} cm.`, 'cm');
  } },
  { id: 'm5-sit-ctverecky', topic: 'm5-obvod-obsah', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 2, 6), b = ri(r, 2, 6); const half = (a * b) / 2;
    return numT(`Ve čtvercové síti (1 čtvereček = 1 cm²) je pravoúhlý trojúhelník, jehož odvěsny měří ${a} cm a ${b} cm. Jaký je jeho obsah?`, half, `Trojúhelník je polovina obdélníku ${a} × ${b}: ${a * b} : 2 = ${fmt(half)} cm².`, 'cm²');
  } },
  { id: 'm5-kvadr-krychle', topic: 'm5-telesa-krychlove-stavby', grade: 5, diff: 2, make: (r) => {
    const a = ri(r, 2, 5), b = ri(r, 2, 5), c = ri(r, 2, 4);
    return numT(`Kvádr je postavený z krychliček: ${a} ${pl(a, 'krychlička', 'krychličky', 'krychliček')} na délku, ${b} na šířku a ${c} na výšku. Kolik krychliček obsahuje?`, a * b * c, `${a} · ${b} = ${a * b} v jedné vrstvě, ${c} ${pl(c, 'vrstva', 'vrstvy', 'vrstev')}: ${a * b} · ${c} = ${a * b * c}.`, undefined, { count: true });
  } },
  { id: 'm5-rada', topic: 'm5-nestandardni', grade: 5, diff: 2, make: (r) => {
    const t = ri(r, 0, 2);
    if (t === 0) { const a = ri(r, 1, 20), d = ri(r, 2, 9); const s = [0, 1, 2, 3].map((i) => a + i * d); return numT(`Doplň další číslo řady: ${s.join(', ')}, …`, a + 4 * d, `Každé číslo je o ${d} větší: ${s[3]} + ${d} = ${a + 4 * d}.`); }
    if (t === 1) { const a = ri(r, 1, 5), q = ri(r, 2, 3); const s = [0, 1, 2, 3].map((i) => a * q ** i); return numT(`Doplň další číslo řady: ${s.join(', ')}, …`, a * q ** 4, `Každé číslo je ${q}krát větší: ${s[3]} · ${q} = ${a * q ** 4}.`); }
    const a = ri(r, 1, 10); const s = [a, a + 3, a + 7, a + 12]; return numT(`Doplň další číslo řady: ${s.join(', ')}, …`, a + 18, `Přičítáme postupně 3, 4, 5, 6: ${a + 12} + 6 = ${a + 18}.`);
  } },

  // ============ GRADE 7 ============
  { id: 'm7-nsd', topic: 'm7-delitelnost', grade: 7, diff: 2, make: (r) => {
    const g = pick(r, [2, 3, 4, 5, 6, 7, 8, 9, 12]); let x = ri(r, 2, 9), y = ri(r, 2, 9); while (gcd(x, y) !== 1 || x === y) { x = ri(r, 2, 9); y = ri(r, 2, 11); }
    const a = g * x, b = g * y;
    return numT(`Urči největšího společného dělitele D(${a}, ${b}).`, g, `${a} = ${g} · ${x}, ${b} = ${g} · ${y}; ${x} a ${y} jsou nesoudělná, proto D = ${g}.`, undefined, { a, b, f: 'gcd' });
  } },
  { id: 'm7-nsn', topic: 'm7-delitelnost', grade: 7, diff: 2, make: (r) => {
    let a = ri(r, 4, 18), b = ri(r, 4, 18); while (a === b) b = ri(r, 4, 18);
    return numT(`Urči nejmenší společný násobek n(${a}, ${b}).`, lcm(a, b), `Nejmenší číslo dělitelné ${a} i ${b} je ${lcm(a, b)} (n = ${a} · ${b} : D(${a}, ${b}) = ${a * b} : ${gcd(a, b)}).`, undefined, { a, b, f: 'lcm' });
  } },
  { id: 'm7-nsn-slovni', topic: 'm7-delitelnost', grade: 7, diff: 3, make: (r) => {
    let a = pick(r, [6, 8, 10, 12, 15, 20]), b = pick(r, [9, 12, 15, 18, 25, 30]); if (a === b) b += 3;
    const l = lcm(a, b);
    return numT(`Z nádraží odjíždí autobus linky A každých ${a} minut a linky B každých ${b} minut. V 6.00 odjely oba současně. Za kolik minut nejdříve odjedou znovu současně?`, l, `Hledáme nejmenší společný násobek n(${a}, ${b}) = ${l}.`, 'min', { a, b, f: 'lcm' });
  } },
  { id: 'm7-delitelnost-yn', topic: 'm7-delitelnost', grade: 7, diff: 1, make: (r) => {
    const k = pick(r, [3, 4, 6, 9]); const n = ri(r, 100, 9999); const yes = n % k === 0;
    const rule: Record<number, string> = { 3: 'ciferný součet je dělitelný 3', 4: 'poslední dvojčíslí je dělitelné 4', 6: 'je sudé a dělitelné 3', 9: 'ciferný součet je dělitelný 9' };
    const cs = String(n).split('').reduce((s, c) => s + Number(c), 0);
    return { kind: 'yn' as const, prompt: `Je číslo ${fmt(n)} dělitelné ${k}?`, answer: yes, explain: `Číslo je dělitelné ${k}, když ${rule[k]}. Ciferný součet je ${cs}, poslední dvojčíslí ${n % 100}. ${fmt(n)} : ${k} ${yes ? `= ${fmt(n / k)}` : `dává zbytek ${n % k}`}.`, meta: { n, k } };
  } },
  { id: 'm7-prvocislo', topic: 'm7-delitelnost', grade: 7, diff: 2, make: (r) => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const comp = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 95, 99];
    const p = pick(r, primes); const ds = shuffle(r, comp).slice(0, 3); const opts = shuffle(r, [p, ...ds]);
    return { kind: 'mc' as const, prompt: 'Které z čísel je prvočíslo?', options: opts.map(String), correct: opts.indexOf(p), explain: `${p} je dělitelné jen 1 a samo sebou. Ostatní: ${ds.map((c) => { for (let d = 3; d < c; d++) if (c % d === 0) return `${c} = ${d} · ${c / d}`; return String(c); }).join(', ')}.`, meta: { p } };
  } },
  { id: 'm7-rozklad', topic: 'm7-delitelnost', grade: 7, diff: 2, make: (r) => {
    const fs = Array.from({ length: ri(r, 3, 4) }, () => pick(r, [2, 2, 3, 3, 5, 7])).sort((a, b) => a - b); const n = fs.reduce((a, b) => a * b, 1);
    const correct = fs.join(' · ');
    const wrong1 = [...fs.slice(0, -1), fs[fs.length - 1] * 2].join(' · ');
    const wrong2 = fs.length > 2 ? [fs[0] * fs[1], ...fs.slice(2)].join(' · ') : '2 · ' + n / 2;
    const wrong3 = [...fs.slice(1), 3].sort((a, b) => a - b).join(' · ');
    const optsSet = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
    while (optsSet.length < 4) optsSet.push(`${n} · 1`);
    const opts = shuffle(r, optsSet.slice(0, 4));
    return { kind: 'mc' as const, prompt: `Který zápis je rozklad čísla ${n} na součin prvočísel?`, options: opts, correct: opts.indexOf(correct), explain: `${n} = ${correct}; všechny činitele jsou prvočísla a jejich součin je ${n}.`, meta: { n, fs } };
  } },
  { id: 'm7-vyraz', topic: 'm7-ciselne-vyrazy', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 2, 12), b = ri(r, 2, 9), c = ri(r, 2, 9), d = ri(r, 1, 20);
    const t = ri(r, 0, 2);
    if (t === 0) { const v = a * a - b * c + d; return numT(`Vypočítej: ${a}² − ${b} · ${c} + ${d}`, v, `${a}² = ${a * a}; ${b} · ${c} = ${b * c}; ${a * a} − ${b * c} + ${d} = ${v}.`, undefined, { expr: `${a}*${a}-${b}*${c}+${d}` }); }
    if (t === 1) { const v = (a + b) * (c - 1) - d; return numT(`Vypočítej: (${a} + ${b}) · (${c} − 1) − ${d}`, v, `${a + b} · ${c - 1} = ${(a + b) * (c - 1)}; − ${d} = ${v}.`, undefined, { expr: `(${a}+${b})*(${c}-1)-${d}` }); }
    const s = ri(r, 2, 10); return numT(`Vypočítej: √${s * s} · ${b} − ${a} · ${c}`, s * b - a * c, `√${s * s} = ${s}; ${s} · ${b} = ${s * b}; ${a} · ${c} = ${a * c}; ${s * b} − ${a * c} = ${s * b - a * c}.`, undefined, { expr: `${s}*${b}-${a}*${c}` });
  } },
  { id: 'm7-mocnina', topic: 'm7-ciselne-vyrazy', grade: 7, diff: 1, make: (r) => {
    const t = ri(r, 0, 3);
    if (t === 0) { const a = ri(r, 11, 25); return numT(`Vypočítej: ${a}²`, a * a, `${a}² = ${a} · ${a} = ${a * a}.`, undefined, { expr: `${a}*${a}` }); }
    if (t === 1) { const a = ri(r, 2, 10); return numT(`Vypočítej: √${a * a}`, a, `${a} · ${a} = ${a * a}, proto √${a * a} = ${a}.`, undefined, { sq: a }); }
    if (t === 2) { const a = pick(r, [0.1, 0.2, 0.3, 0.5, 0.9, 1.1, 1.2]); return numT(`Vypočítej: ${fmt(a)}²`, Math.round(a * a * 100) / 100, `${fmt(a)} · ${fmt(a)} = ${fmt(Math.round(a * a * 100) / 100)}.`); }
    const a = pick(r, [10, 20, 30, 40, 50, 100]); return numT(`Vypočítej: ${a}²`, a * a, `${a}² = ${fmt(a * a)}.`, undefined, { expr: `${a}*${a}` });
  } },
  { id: 'm7-cela', topic: 'm7-cela-cisla', grade: 7, diff: 1, make: (r) => {
    const a = ri(r, -20, 20), b = ri(r, -15, 15) || 3; const op = pick(r, ['+', '−', '·']);
    const v = op === '+' ? a + b : op === '−' ? a - b : a * b; const p = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));
    return numT(`Vypočítej: ${fmt(a)} ${op} ${p(b)}`, v, op === '·' ? `Součin: ${Math.abs(a)} · ${Math.abs(b)} = ${Math.abs(a * b)}, znaménko ${a * b < 0 ? 'záporné (různá znaménka)' : 'kladné'}.` : `${fmt(a)} ${op} ${p(b)} = ${fmt(v)}.`, undefined, { expr: `${a}${op === '−' ? '-' : op === '·' ? '*' : '+'}(${b})` });
  } },
  { id: 'm7-cela-del', topic: 'm7-cela-cisla', grade: 7, diff: 2, make: (r) => {
    const q = ri(r, -12, 12) || 4, d = (ri(r, 2, 9)) * (r() < 0.5 ? -1 : 1); const n = q * d; const p = (x: number) => (x < 0 ? `(${fmt(x)})` : fmt(x));
    return numT(`Vypočítej: ${fmt(n)} : ${p(d)}`, q, `${Math.abs(n)} : ${Math.abs(d)} = ${Math.abs(q)}, znaménko ${q < 0 ? 'záporné' : 'kladné'}: ${fmt(q)}.`, undefined, { expr: `${n}/(${d})` });
  } },
  { id: 'm7-absolutni', topic: 'm7-cela-cisla', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, -30, -1), b = ri(r, -20, 20); const v = Math.abs(a) - Math.abs(b);
    return numT(`Vypočítej: |${fmt(a)}| − |${fmt(b)}|`, v, `|${fmt(a)}| = ${-a}, |${fmt(b)}| = ${Math.abs(b)}; ${-a} − ${Math.abs(b)} = ${fmt(v)}.`, undefined, { expr: `${Math.abs(a)}-${Math.abs(b)}` });
  } },
  { id: 'm7-cela-slovni', topic: 'm7-cela-cisla', grade: 7, diff: 2, make: (r) => {
    const t1 = ri(r, -15, -2), t2 = ri(r, 1, 12);
    return numT(`V noci bylo ${fmt(t1)} °C, v poledne ${fmt(t2)} °C. O kolik stupňů se oteplilo?`, t2 - t1, `${fmt(t2)} − (${fmt(t1)}) = ${t2} + ${-t1} = ${t2 - t1} °C.`, '°C');
  } },
  { id: 'm7-desetinna', topic: 'm7-desetinna-cisla', grade: 7, diff: 1, make: (r) => {
    const a = ri(r, 11, 999) / 10, b = ri(r, 11, 99) / 100; const op = pick(r, ['+', '−', '·']);
    const v = op === '+' ? a + b : op === '−' ? a - b : a * b; const vr = Math.round(v * 10000) / 10000;
    return numT(`Vypočítej: ${fmt(a)} ${op} ${fmt(b)}`, vr, op === '·' ? `Násobíme jako celá čísla a výsledek má tolik desetinných míst, kolik mají činitelé dohromady: ${fmt(vr)}.` : `Zapíšeme pod sebe tak, aby desetinné čárky byly pod sebou: ${fmt(vr)}.`, undefined, { a, b, op });
  } },
  { id: 'm7-desetinna-01', topic: 'm7-desetinna-cisla', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 12, 9999) / 10; const k = pick(r, [0.1, 0.01]); const mult = r() < 0.5;
    const v = mult ? Math.round(a * k * 10000) / 10000 : Math.round((a / k) * 10000) / 10000;
    return numT(`Vypočítej: ${fmt(a)} ${mult ? '·' : ':'} ${fmt(k)}`, v, `${mult ? 'Násobit' : 'Dělit'} ${fmt(k)} znamená posunout desetinnou čárku o ${k === 0.1 ? 'jedno místo' : 'dvě místa'} ${mult ? 'doleva' : 'doprava'}: ${fmt(v)}.`, undefined, { a, k, mult });
  } },
  { id: 'm7-zaokrouhli-des', topic: 'm7-desetinna-cisla', grade: 7, diff: 1, make: (r) => {
    const a = ri(r, 1000, 99999) / 1000; const places = pick(r, [1, 2]); const v = Math.round(a * 10 ** places + 1e-9) / 10 ** places;
    return numT(`Zaokrouhli ${fmt(a)} na ${places === 1 ? 'desetiny' : 'setiny'}.`, v, `Rozhoduje další číslice: výsledek ${fmt(v)}.`, undefined, { a, places });
  } },
  { id: 'm7-zlomky-scit', topic: 'm7-zlomky', grade: 7, diff: 2, make: (r) => {
    const b = ri(r, 2, 9), d = ri(r, 2, 9); let a = ri(r, 1, b * 2), c = ri(r, 1, d * 2); if (a % b === 0) a++; if (c % d === 0) c++; const plus = r() < 0.6;
    let n = plus ? a * d + c * b : a * d - c * b; let m = b * d; const g = gcd(n, m) || 1; n /= g; m /= g;
    const ans = m === 1 ? fmt(n) : frac(n, m);
    return { kind: 'num' as const, strict: true, prompt: `Vypočítej a výsledek zapiš v základním tvaru: ${a}/${b} ${plus ? '+' : '−'} ${c}/${d}`, answers: [ans, ans.replace('−', '-')], explain: `Společný jmenovatel ${b * d}: ${a * d}/${b * d} ${plus ? '+' : '−'} ${c * b}/${b * d} = ${plus ? a * d + c * b : a * d - c * b}/${b * d}${g !== 1 ? ` = ${ans} (zkráceno ${g})` : ''}.`, meta: { a, b, c, d, op: plus ? '+' : '-' } };
  } },
  { id: 'm7-zlomky-nasob', topic: 'm7-zlomky', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 1, 9), b = ri(r, 2, 10), c = ri(r, 1, 9), d = ri(r, 2, 10); const div = r() < 0.5;
    let n = div ? a * d : a * c; let m = div ? b * c : b * d; const g = gcd(n, m); n /= g; m /= g;
    const ans = m === 1 ? fmt(n) : frac(n, m);
    return { kind: 'num' as const, strict: true, prompt: `Vypočítej a výsledek zapiš v základním tvaru: ${a}/${b} ${div ? ':' : '·'} ${c}/${d}`, answers: [ans], explain: div ? `Dělit zlomkem = násobit převráceným zlomkem: ${a}/${b} · ${d}/${c} = ${a * d}/${b * c}${g !== 1 ? ` = ${ans}` : ''}.` : `Čitatel · čitatel, jmenovatel · jmenovatel: ${a * c}/${b * d}${g !== 1 ? ` = ${ans}` : ''}.`, meta: { a, b, c, d, op: div ? '/' : '*' } };
  } },
  { id: 'm7-zlomky-kraceni', topic: 'm7-zlomky', grade: 7, diff: 1, make: (r) => {
    let n = ri(r, 1, 9), m = ri(r, 2, 12); while (gcd(n, m) !== 1 || n >= m) { n = ri(r, 1, 9); m = ri(r, 2, 12); }
    const k = ri(r, 2, 9);
    return { kind: 'num' as const, strict: true, prompt: `Zkrať na základní tvar: ${n * k}/${m * k}`, answers: [`${n}/${m}`], explain: `Čitatel i jmenovatel vydělíme jejich největším společným dělitelem ${k}: ${n}/${m}.`, meta: { n: n * k, m: m * k } };
  } },
  { id: 'm7-zlomek-desetinne', topic: 'm7-zlomky', grade: 7, diff: 2, make: (r) => {
    const [n, m] = pick(r, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 20], [9, 25], [3, 20]] as [number, number][]);
    return numT(`Převeď zlomek ${n}/${m} na desetinné číslo.`, n / m, `${n} : ${m} = ${fmt(n / m)}.`, undefined, { n, m });
  } },
  { id: 'm7-smisene', topic: 'm7-zlomky', grade: 7, diff: 2, make: (r) => {
    const w = ri(r, 1, 5), m = ri(r, 2, 9), n = ri(r, 1, m - 1);
    return { kind: 'num' as const, strict: true, prompt: `Převeď smíšené číslo ${w} ${n}/${m} na zlomek (nezkracuj, pokud nelze).`, answers: [frac(w * m + n, m)], explain: `${w} · ${m} + ${n} = ${w * m + n}, tedy ${w * m + n}/${m}.`, meta: { w, n, m } };
  } },
  { id: 'm7-procenta-cast', topic: 'm7-procenta', grade: 7, diff: 1, make: (r) => {
    const p = pick(r, [5, 10, 15, 20, 25, 30, 40, 50, 60, 75]); const z = ri(r, 2, 40) * 20;
    return numT(`Kolik je ${p} % z ${fmt(z)}?`, (p * z) / 100, `1 % z ${fmt(z)} je ${fmt(z / 100)}, ${p} % je ${p} · ${fmt(z / 100)} = ${fmt((p * z) / 100)}.`, undefined, { p, z, f: 'part' });
  } },
  { id: 'm7-procenta-pocet', topic: 'm7-procenta', grade: 7, diff: 2, make: (r) => {
    const z = pick(r, [20, 25, 40, 50, 80, 200, 250, 400, 500]); const p = pick(r, [5, 10, 20, 25, 30, 40, 60, 75, 80]); const c = (z * p) / 100;
    if (!Number.isInteger(c)) return numT(`Kolik je 10 % z ${z}?`, z / 10, `${z} : 10 = ${fmt(z / 10)}.`, undefined, { p: 10, z, f: 'part' });
    return numT(`Turnaje se účastní ${z} hráčů. ${fmt(c)} z nich je z Brna. Kolik procent hráčů je z Brna?`, p, `${fmt(c)} : ${z} = ${fmt(c / z)} = ${p} %.`, '%', { p, z, c, f: 'pct' });
  } },
  { id: 'm7-procenta-zaklad', topic: 'm7-procenta', grade: 7, diff: 2, make: (r) => {
    const p = pick(r, [10, 20, 25, 40, 50]); const z = ri(r, 2, 30) * 20; const c = (p * z) / 100;
    return numT(`${p} % z neznámého čísla je ${fmt(c)}. Jaké je to číslo?`, z, `1 % = ${fmt(c)} : ${p} = ${fmt(c / p)}, 100 % = ${fmt(z)}.`, undefined, { p, c, f: 'base' });
  } },
  { id: 'm7-sleva', topic: 'm7-procenta', grade: 7, diff: 2, make: (r) => {
    const price = ri(r, 4, 60) * 50; const p = pick(r, [10, 20, 25, 30, 40, 50]); const up = r() < 0.35;
    const v = up ? price * (1 + p / 100) : price * (1 - p / 100);
    return numT(`Bunda stála ${fmt(price)} Kč. Cena se ${up ? 'zvýšila' : 'snížila'} o ${p} %. Kolik stojí nyní?`, v, `${p} % z ${fmt(price)} je ${fmt((price * p) / 100)} Kč; ${fmt(price)} ${up ? '+' : '−'} ${fmt((price * p) / 100)} = ${fmt(v)} Kč.`, 'Kč', { price, p, up });
  } },
  { id: 'm7-promile', topic: 'm7-procenta', grade: 7, diff: 2, make: (r) => {
    const z = ri(r, 2, 50) * 1000; const p = pick(r, [1, 2, 3, 5, 8]);
    return numT(`Kolik je ${p} ‰ z ${fmt(z)}?`, (z * p) / 1000, `1 ‰ = 1/1000 → ${fmt(z)} : 1000 = ${fmt(z / 1000)}, · ${p} = ${fmt((z * p) / 1000)}.`, undefined, { p, z, f: 'promile' });
  } },
  { id: 'm7-urok', topic: 'm7-procenta', grade: 7, diff: 3, make: (r) => {
    const z = ri(r, 2, 50) * 1000; const p = pick(r, [1, 2, 3, 4, 5]);
    return numT(`Na účet jsme uložili ${fmt(z)} Kč s roční úrokovou sazbou ${p} %. Kolik korun úroku dostaneme za 1 rok (bez daně)?`, (z * p) / 100, `${p} % z ${fmt(z)} = ${fmt((z * p) / 100)} Kč.`, 'Kč', { p, z, f: 'part' });
  } },
  { id: 'm7-pomer-deleni', topic: 'm7-pomer', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 1, 5); let b = ri(r, 1, 6); if (b === a) b = a + 1; const k = ri(r, 2, 30) * (r() < 0.5 ? 10 : 1); const total = (a + b) * k;
    const n1 = pick(r, NAMES_F), n2 = pick(r, NAMES_M);
    return numT(`${n1} a ${n2} si rozdělí ${fmt(total)} Kč v poměru ${a} : ${b}. Kolik korun dostane ${n1}?`, a * k, `Celkem ${a + b} ${pl(a + b, 'díl', 'díly', 'dílů')}, 1 díl = ${fmt(total)} : ${a + b} = ${fmt(k)} Kč. ${n1}: ${a} · ${fmt(k)} = ${fmt(a * k)} Kč.`, 'Kč', { a, b, total });
  } },
  { id: 'm7-pomer-kraceni', topic: 'm7-pomer', grade: 7, diff: 1, make: (r) => {
    let a = ri(r, 1, 9), b = ri(r, 1, 9); while (gcd(a, b) !== 1 || a === b) { a = ri(r, 1, 9); b = ri(r, 1, 9); }
    const k = ri(r, 2, 12);
    return { kind: 'num' as const, strict: true, prompt: `Uprav poměr ${a * k} : ${b * k} na základní tvar (zapiš ve tvaru a:b).`, answers: [`${a}:${b}`], explain: `Obě čísla vydělíme ${k}: ${a} : ${b}.`, meta: { a: a * k, b: b * k } };
  } },
  { id: 'm7-meritko', topic: 'm7-pomer', grade: 7, diff: 2, make: (r) => {
    const m = pick(r, [10000, 25000, 50000, 100000, 200000]); const cm = ri(r, 2, 15);
    const km = (cm * m) / 100000;
    return numT(`Na mapě s měřítkem 1 : ${fmt(m)} je vzdálenost dvou obcí ${cm} cm. Jaká je skutečná vzdálenost v kilometrech?`, km, `${cm} cm · ${fmt(m)} = ${fmt(cm * m)} cm = ${fmt(km)} km.`, 'km', { m, cm });
  } },
  { id: 'm7-pomer-zmena', topic: 'm7-pomer', grade: 7, diff: 2, make: (r) => {
    let a = ri(r, 2, 5), b = ri(r, 2, 5); while (a === b || gcd(a, b) !== 1) { a = ri(r, 1, 5); b = ri(r, 2, 5); } const n = ri(r, 2, 20) * b;
    return numT(`Změň číslo ${n} v poměru ${a} : ${b}.`, (n * a) / b, `${n} · ${a}/${b} = ${n} : ${b} · ${a} = ${fmt((n * a) / b)}.`, undefined, { n, a, b });
  } },
  { id: 'm7-prima', topic: 'm7-umernost', grade: 7, diff: 1, make: (r) => {
    const k = ri(r, 2, 9), price = ri(r, 3, 40); const k2 = ri(r, 2, 15);
    return numT(`${k} ${pl(k, 'rohlík stojí', 'rohlíky stojí', 'rohlíků stojí')} ${k * price} Kč. Kolik korun stojí ${k2} ${pl(k2, 'rohlík', 'rohlíky', 'rohlíků')}?`, k2 * price, `Přímá úměrnost: 1 rohlík stojí ${k * price} : ${k} = ${price} Kč, ${k2} rohlíků ${k2} · ${price} = ${k2 * price} Kč.`, 'Kč');
  } },
  { id: 'm7-neprima', topic: 'm7-umernost', grade: 7, diff: 2, make: (r) => {
    const w1 = ri(r, 2, 6), d1 = pick(r, [4, 6, 8, 10, 12]); const total = w1 * d1; const divs = [] as number[]; for (let i = 2; i <= 24; i++) if (total % i === 0 && i !== w1 && total / i >= 2) divs.push(i);
    const w2 = pick(r, divs); const d2 = total / w2;
    return numT(`${w1} ${pl(w1, 'dělník by udělal', 'dělníci by udělali', 'dělníků by udělalo')} práci za ${d1} ${pl(d1, 'den', 'dny', 'dní')}. Za kolik dní bude práce hotová, když dělníků bude ${w2}? (Všichni pracují stejně rychle.)`, d2, `Nepřímá úměrnost: celá práce = ${w1} · ${d1} = ${total} „dělníkodní“. ${total} : ${w2} = ${fmt(d2)} ${pl(d2, 'den', 'dny', 'dní')}.`, undefined, { w1, d1, w2, count: true });
  } },
  { id: 'm7-umernost-typ', topic: 'm7-umernost', grade: 7, diff: 1, make: (r) => {
    const items: [string, number][] = [['počet kopečků zmrzliny a cena za ně', 0], ['počet malířů a doba malování stejné místnosti', 1], ['rychlost auta a doba jízdy na stejnou vzdálenost', 1], ['počet litrů benzínu a jeho cena', 0], ['počet sešitů a jejich hmotnost', 0], ['počet čerpadel a doba vyčerpání bazénu', 1]];
    const [s, k] = pick(r, items); const opts = ['přímá úměrnost', 'nepřímá úměrnost', 'nejde o úměrnost'];
    return { kind: 'mc' as const, prompt: `Jaký vztah je mezi veličinami: ${s}?`, options: opts, correct: k, explain: k === 0 ? 'Kolikrát se zvětší jedna veličina, tolikrát se zvětší druhá – přímá úměrnost.' : 'Kolikrát se zvětší jedna veličina, tolikrát se zmenší druhá – nepřímá úměrnost.' };
  } },
  { id: 'm7-prumer', topic: 'm7-data-prumer', grade: 7, diff: 1, make: (r) => {
    const n = ri(r, 3, 6); let vals = Array.from({ length: n }, () => ri(r, 1, 5)); const s = vals.reduce((a, b) => a + b, 0);
    const rest = s % n; if (rest) vals[0] += n - rest;
    const sum = vals.reduce((a, b) => a + b, 0);
    return numT(`Známky z matematiky: ${vals.join(', ')}. Jaký je aritmetický průměr?`, sum / n, `Součet ${vals.join(' + ')} = ${sum}, počet ${n}: ${sum} : ${n} = ${fmt(sum / n)}.`, undefined, { vals });
  } },
  { id: 'm7-prumer2', topic: 'm7-data-prumer', grade: 7, diff: 3, make: (r) => {
    const n = ri(r, 3, 5), avg = ri(r, 5, 20); const newAvg = avg + ri(r, 1, 4);
    const x = newAvg * (n + 1) - avg * n;
    return numT(`Průměr ${n} čísel je ${avg}. Po přidání dalšího čísla je průměr ${newAvg}. Jaké číslo jsme přidali?`, x, `Součet původních čísel ${n} · ${avg} = ${n * avg}, nový součet ${n + 1} · ${newAvg} = ${(n + 1) * newAvg}. Přidané číslo: ${(n + 1) * newAvg} − ${n * avg} = ${x}.`);
  } },
  { id: 'm7-kruhovy', topic: 'm7-data-prumer', grade: 7, diff: 2, make: (r) => {
    const total = pick(r, [20, 40, 60, 120, 200, 360]); const p = pick(r, [10, 25, 50, 75, 30]);
    const c = (total * p) / 100; if (!Number.isInteger(c)) return numT(`Kruhový diagram: polovina z ${total} žáků jezdí do školy autobusem. Kolik je to žáků?`, total / 2, `${total} : 2 = ${total / 2}.`);
    return numT(`V kruhovém diagramu zabírá výseč „pěšky“ ${p} % kruhu. Dotazováno bylo ${total} žáků. Kolik žáků chodí pěšky?`, c, `${p} % z ${total} = ${fmt(c)}.`, undefined, { count: true });
  } },
  { id: 'm7-souradnice', topic: 'm7-data-prumer', grade: 7, diff: 2, make: (r) => {
    const x = ri(r, -6, 6), y = ri(r, -6, 6); const q = x > 0 && y > 0 ? 'I.' : x < 0 && y > 0 ? 'II.' : x < 0 && y < 0 ? 'III.' : x > 0 && y < 0 ? 'IV.' : 'na ose';
    const opts = ['I.', 'II.', 'III.', 'IV.', 'na ose'];
    return { kind: 'mc' as const, prompt: `Ve kterém kvadrantu leží bod A[${fmt(x)}; ${fmt(y)}]?`, options: opts, correct: opts.indexOf(q), explain: `I. kvadrant: x > 0, y > 0; II.: x < 0, y > 0; III.: x < 0, y < 0; IV.: x > 0, y < 0. Leží-li bod na ose, nepatří do žádného kvadrantu.` };
  } },
  { id: 'm7-slovni-usudek', topic: 'm7-slovni-ulohy', grade: 7, diff: 2, make: (r) => {
    const t = ri(r, 0, 2);
    if (t === 0) { const x = ri(r, 5, 40); const k = ri(r, 2, 4); const d = ri(r, 2, 15); const total = x + k * x + d; return numT(`Tři sourozenci mají dohromady ${total} Kč. Nejstarší má ${d} Kč, prostřední má ${k}krát více než nejmladší. Kolik korun má nejmladší?`, x, `Bez nejstaršího: ${total} − ${d} = ${total - d} Kč, to je ${1 + k} dílů (1 + ${k}). Jeden díl: ${total - d} : ${1 + k} = ${x} Kč.`, 'Kč'); }
    if (t === 1) { const v = ri(r, 3, 6) * 10, h = ri(r, 2, 5); return numT(`Auto jede stálou rychlostí ${v} km/h. Kolik kilometrů ujede za ${h} hodiny a 30 minut?`, v * h + v / 2, `${v} · ${h} = ${v * h} km, za půl hodiny ${v / 2} km; celkem ${v * h + v / 2} km.`, 'km'); }
    const a = ri(r, 2, 6) * 6; return numT(`Na výlet jelo ${a} dětí. Třetina jela vlakem, polovina zbytku na kole, ostatní autem. Kolik dětí jelo autem?`, (a - a / 3) / 2, `Vlakem ${a / 3}, zbytek ${a - a / 3}, na kole polovina = ${(a - a / 3) / 2}, autem také ${(a - a / 3) / 2}.`, undefined, { count: true });
  } },
  { id: 'm7-slovni-spolecna', topic: 'm7-slovni-ulohy', grade: 7, diff: 3, make: (r) => {
    const [a, b] = pick(r, [[2, 3], [3, 6], [4, 12], [6, 3], [4, 6], [10, 15], [6, 12]] as [number, number][]);
    const t = (a * b) / (a + b);
    return numT(`Jedno čerpadlo vyčerpá bazén za ${a} h, druhé za ${b} h. Za kolik minut vyčerpají bazén obě současně?`, t * 60, `Za 1 h: 1/${a} + 1/${b} = ${(a + b) / gcd(a + b, a * b)}/${(a * b) / gcd(a + b, a * b)} bazénu. Celý bazén tedy za ${fmt(t)} h = ${fmt(t * 60)} min.`, 'min', { a, b });
  } },
  { id: 'm7-uhel-vedlejsi', topic: 'm7-uhly', grade: 7, diff: 1, make: (r) => {
    const a = ri(r, 10, 170); const t = ri(r, 0, 2);
    if (t === 0) return numT(`Úhel α = ${a}°. Jak velký je úhel k němu vedlejší?`, 180 - a, `Vedlejší úhly dávají 180°: 180° − ${a}° = ${180 - a}°.`, '°');
    if (t === 1) return numT(`Úhel α = ${a}°. Jak velký je úhel k němu vrcholový?`, a, `Vrcholové úhly jsou shodné: ${a}°.`, '°');
    const b = ri(r, 10, 160 - Math.min(a, 150)); const aa = Math.min(a, 150); return numT(`V trojúhelníku je α = ${aa}° a β = ${b}°. Jak velký je úhel γ?`, 180 - aa - b, `γ = 180° − ${aa}° − ${b}° = ${180 - aa - b}°.`, '°');
  } },
  { id: 'm7-uhel-minuty', topic: 'm7-uhly', grade: 7, diff: 2, make: (r) => {
    const d1 = ri(r, 10, 80), m1 = ri(r, 10, 55), d2 = ri(r, 10, 80), m2 = ri(r, 10, 55);
    const tot = d1 * 60 + m1 + d2 * 60 + m2; const D = Math.floor(tot / 60), M = tot % 60;
    return { kind: 'num' as const, strict: true, prompt: `Sečti úhly: ${d1}° ${m1}′ + ${d2}° ${m2}′ (zapiš ve tvaru např. 95°12′)`, answers: [`${D}°${M}′`, `${D}°${M}'`, `${D}° ${M}′`], explain: `Minuty: ${m1} + ${m2} = ${m1 + m2}′${m1 + m2 >= 60 ? ` = 1° ${m1 + m2 - 60}′` : ''}; stupně: ${d1} + ${d2}${m1 + m2 >= 60 ? ' + 1' : ''} = ${D}°. Výsledek ${D}° ${M}′.`, meta: { d1, m1, d2, m2 } };
  } },
  { id: 'm7-uhel-rovnoramenny', topic: 'm7-trojuhelniky', grade: 7, diff: 2, make: (r) => {
    const top = ri(r, 10, 85) * 2; const base = (180 - top) / 2;
    return numT(`Rovnoramenný trojúhelník má úhel při hlavním vrcholu ${top}°. Jak velký je úhel při základně?`, base, `(180° − ${top}°) : 2 = ${base}°.`, '°');
  } },
  { id: 'm7-obsah-troj', topic: 'm7-obvod-obsah', grade: 7, diff: 2, make: (r) => {
    const t = ri(r, 0, 2); const a = ri(r, 3, 20), v = ri(r, 2, 15);
    if (t === 0) return numT(`Trojúhelník má stranu a = ${a} cm a výšku k ní vₐ = ${v} cm. Jaký je jeho obsah?`, (a * v) / 2, `S = a · vₐ : 2 = ${a} · ${v} : 2 = ${fmt((a * v) / 2)} cm².`, 'cm²');
    if (t === 1) return numT(`Rovnoběžník má stranu ${a} cm a výšku k ní ${v} cm. Jaký je jeho obsah?`, a * v, `S = a · v = ${a} · ${v} = ${a * v} cm².`, 'cm²');
    const c = ri(r, 2, a); return numT(`Lichoběžník má základny ${a} cm a ${c} cm a výšku ${v} cm. Jaký je jeho obsah?`, ((a + c) * v) / 2, `S = (a + c) · v : 2 = (${a} + ${c}) · ${v} : 2 = ${fmt(((a + c) * v) / 2)} cm².`, 'cm²');
  } },
  { id: 'm7-slozeny', topic: 'm7-obvod-obsah', grade: 7, diff: 3, make: (r) => {
    const a = ri(r, 6, 15), b = ri(r, 4, 10), c = ri(r, 2, a - 2), d = ri(r, 1, b - 2);
    return numT(`Z obdélníku ${a} cm × ${b} cm vystřihneme v rohu obdélník ${c} cm × ${d} cm. Jaký je obsah zbylého obrazce?`, a * b - c * d, `${a} · ${b} − ${c} · ${d} = ${a * b} − ${c * d} = ${a * b - c * d} cm².`, 'cm²');
  } },
  { id: 'm7-prevod-obsah', topic: 'm7-obvod-obsah', grade: 7, diff: 2, make: (r) => {
    const conv = pick(r, [['m²', 'cm²', 10000], ['dm²', 'cm²', 100], ['ha', 'm²', 10000], ['km²', 'ha', 100], ['m²', 'dm²', 100], ['cm²', 'mm²', 100]] as [string, string, number][]);
    const v = ri(r, 2, 90) / (r() < 0.5 ? 1 : 10);
    return numT(`Převeď: ${fmt(v)} ${conv[0]} = ? ${conv[1]}`, Math.round(v * conv[2] * 1000) / 1000, `1 ${conv[0]} = ${fmt(conv[2])} ${conv[1]}: ${fmt(v)} · ${fmt(conv[2])} = ${fmt(v * conv[2])}.`, conv[1]);
  } },
  { id: 'm7-kvadr', topic: 'm7-telesa', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 2, 12), b = ri(r, 2, 10), c = ri(r, 2, 10);
    if (r() < 0.5) return numT(`Kvádr má rozměry ${a} cm, ${b} cm a ${c} cm. Jaký je jeho objem?`, a * b * c, `V = a · b · c = ${a} · ${b} · ${c} = ${a * b * c} cm³.`, 'cm³', { a, b, c, f: 'V' });
    return numT(`Kvádr má rozměry ${a} cm, ${b} cm a ${c} cm. Jaký je jeho povrch?`, 2 * (a * b + a * c + b * c), `S = 2 · (ab + ac + bc) = 2 · (${a * b} + ${a * c} + ${b * c}) = ${2 * (a * b + a * c + b * c)} cm².`, 'cm²', { a, b, c, f: 'S' });
  } },
  { id: 'm7-krychle', topic: 'm7-telesa', grade: 7, diff: 1, make: (r) => {
    const a = ri(r, 2, 12);
    if (r() < 0.5) return numT(`Krychle má hranu ${a} cm. Jaký je její objem?`, a ** 3, `V = a³ = ${a}³ = ${a ** 3} cm³.`, 'cm³');
    return numT(`Krychle má hranu ${a} cm. Jaký je její povrch?`, 6 * a * a, `S = 6 · a² = 6 · ${a * a} = ${6 * a * a} cm².`, 'cm²');
  } },
  { id: 'm7-litry', topic: 'm7-telesa', grade: 7, diff: 2, make: (r) => {
    const a = ri(r, 2, 10) * 10, b = ri(r, 2, 8) * 10, c = ri(r, 2, 6) * 10;
    return numT(`Akvárium tvaru kvádru má vnitřní rozměry ${a} cm × ${b} cm × ${c} cm. Kolik litrů vody se do něj vejde?`, (a * b * c) / 1000, `V = ${a} · ${b} · ${c} = ${fmt(a * b * c)} cm³ = ${fmt((a * b * c) / 1000)} dm³ = ${fmt((a * b * c) / 1000)} l.`, 'l');
  } },
  { id: 'm7-hranol', topic: 'm7-telesa', grade: 7, diff: 3, make: (r) => {
    const a = ri(r, 2, 8) * 2, va = ri(r, 2, 8), v = ri(r, 3, 15);
    return numT(`Kolmý hranol má podstavu tvaru trojúhelníku se stranou ${a} cm a výškou k ní ${va} cm. Výška hranolu je ${v} cm. Jaký je objem hranolu?`, ((a * va) / 2) * v, `S podstavy = ${a} · ${va} : 2 = ${(a * va) / 2} cm²; V = S · v = ${(a * va) / 2} · ${v} = ${((a * va) / 2) * v} cm³.`, 'cm³');
  } },
  { id: 'm7-rada', topic: 'm7-nestandardni', grade: 7, diff: 2, make: (r) => {
    const t = ri(r, 0, 2);
    if (t === 0) { const a = ri(r, -10, 10), d = ri(r, -7, 7) || 4; const s = [0, 1, 2, 3].map((i) => a + i * d); return numT(`Doplň další člen řady: ${s.map((x) => fmt(x)).join('; ')}; …`, a + 4 * d, `Rozdíl sousedních členů je ${fmt(d)}: ${fmt(s[3])} ${d < 0 ? '−' : '+'} ${Math.abs(d)} = ${fmt(a + 4 * d)}.`); }
    if (t === 1) { const k = ri(r, 1, 4); const s = [1, 2, 3, 4].map((i) => i * i + k); return numT(`Doplň další člen řady: ${s.join('; ')}; …`, 25 + k, `Členy jsou n² + ${k}: 5² + ${k} = ${25 + k}.`); }
    const a = ri(r, 1, 3); const s = [a, a * 2 + 1, (a * 2 + 1) * 2 + 1, ((a * 2 + 1) * 2 + 1) * 2 + 1]; return numT(`Doplň další člen řady: ${s.join('; ')}; …`, s[3] * 2 + 1, `Každý další člen = 2 · předchozí + 1: 2 · ${s[3]} + 1 = ${s[3] * 2 + 1}.`);
  } },
];

const BY_TOPIC: Record<string, Generator[]> = {};
for (const g of GENERATORS) (BY_TOPIC[g.topic] ||= []).push(g);
export const generatorTopics = () => Object.keys(BY_TOPIC);
export const generatorsFor = (topic: string) => BY_TOPIC[topic] || [];

export function runGenerator(g: Generator, seed: number): Task {
  const r = mulberry32(Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0);
  r(); r();
  const base = g.make(r);
  return { ...base, id: `gen:${g.id}:${seed}`, topic: g.topic, grade: g.grade, subject: 'matematika', gen: g.id, diff: g.diff } as Task;
}
export function generate(topic: string, seed: number): Task | null {
  const gs = generatorsFor(topic);
  if (!gs.length) return null;
  const g = gs[seed % gs.length];
  return runGenerator(g, seed);
}
