import type { Task } from './types';
import { STATIC_BY_ID, STATIC_BY_TOPIC } from './data';
import { GENERATORS, runGenerator, generatorsFor } from '../gen/math';
import { CZ_GENERATORS, czItem, czGeneratorsFor } from '../gen/czech';

const GEN_BY_ID = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));
const CZ_BY_ID = Object.fromEntries(CZ_GENERATORS.map((g) => [g.id, g]));

/** Resolve a task reference (static id or "gen:<generator>:<seed|index>") to a task. */
export function resolveTask(id: string): Task | null {
  if (!id.startsWith('gen:')) return STATIC_BY_ID[id] || null;
  const [, gid, n] = id.split(':');
  try {
    if (GEN_BY_ID[gid]) return runGenerator(GEN_BY_ID[gid], Number(n));
    if (CZ_BY_ID[gid]) return czItem(gid, Number(n));
  } catch { /* stale reference */ }
  return null;
}

/** All candidate references for a topic: static ids + a description of generators. */
export function candidates(topicId: string) {
  return {
    stat: (STATIC_BY_TOPIC[topicId] || []).map((t) => t.id),
    math: generatorsFor(topicId).map((g) => g.id),
    cz: czGeneratorsFor(topicId).flatMap((g) => Array.from({ length: g.size }, (_, i) => `gen:${g.id}:${i}`)),
  };
}
