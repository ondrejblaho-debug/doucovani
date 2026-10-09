// Sanity check: feeding the key itself must give full points on every auto-scored item.
import keys from '../src/generated/keys.json';
import { scoreTest, isSelfItem } from '../src/lib/mock';
let bad = 0;
for (const k of keys as any[]) {
  const a: any = {}, self: any = {};
  for (const it of k.items) {
    if (it.type === 'choice' || it.type === 'order' || it.type === 'open') a[it.n] = it.answer ?? '';
    for (const p of it.parts || []) a[p.n] = p.answer ?? '';
    if (isSelfItem(k, it)) { self[it.n] = it.max; for (const p of it.parts || []) self[p.n] = p.pts ?? 0; }
  }
  const s = scoreTest(k, a, self);
  const wrongAuto = s.items.filter((i) => !i.self && i.points !== i.max);
  if (s.points !== 50 || wrongAuto.length) { bad++; console.log(k.id, s.points, wrongAuto.map((i) => i.n)); }
  // all-wrong → 0 auto points
  const z = scoreTest(k, {}, {});
  if (z.points !== 0) { bad++; console.log('nonzero empty', k.id, z.points); }
}
const nSelf = (keys as any[]).map((k) => `${k.id}:${k.items.filter((it: any) => isSelfItem(k, it)).length}`).join(' ');
console.log(bad ? `✗ ${bad} problems` : `✓ all ${keys.length} keys score 50/50 with key answers`); console.log('self-scored items per test:', nSelf);
