// localStorage persistence: one key per profile + one global key (PIN, settings).
import type { ProfileId, Profile } from './data';

export interface AnswerLog { id: string; topic: string; subject: string; ok: boolean; sec: number; review?: boolean }
export interface LessonState {
  date: string;
  kind: 'daily' | 'extra';
  tasks: { id: string; block: string; review?: boolean }[];
  cards: string[]; // topic ids with explanation card
  idx: number;
  answers: AnswerLog[];
  cardSec: number;
  startedAt: number;
  finishedAt?: number;
}
export interface SrsItem { id: string; topic: string; box: number; due: string; lapses: number }
export interface TopicStat { seen: number; correct: number; ema: number; last: string }
export interface MockResult {
  id: string; // unique result id
  testId: string; // e.g. C5A_2023
  mockDate?: string; // scheduled date from curriculum
  subject: 'cestina' | 'matematika';
  date: string;
  points: number;
  max: number;
  autoPoints: number;
  selfPoints: number;
  answers: Record<string, unknown>;
  itemPoints: Record<string, number>;
  minutesUsed?: number;
}
export interface ProfileData {
  v: 1;
  lessons: Record<string, LessonState>; // key: date or date+'#n' for extra practice
  srs: Record<string, SrsItem>;
  topics: Record<string, TopicStat>;
  seen: Record<string, number>; // task id → times shown
  mocks: MockResult[];
  timers: Record<string, { start: number; minutes: number }>; // running mock timers
  drafts: Record<string, Record<string, unknown>>; // unfinished mock answer forms
}
export interface GlobalData {
  v: 2;
  pin: string;
  profiles: Profile[]; // created on the device in the setup flow
  minutes: Record<ProfileId, Record<string, number>>; // weekday override per profile, e.g. { Po: 30 }
  lastProfile?: ProfileId;
}

const PKEY = (id: ProfileId) => `doucovani:v1:profile:${id}`;
const GKEY = 'doucovani:v1:global';

export const emptyProfile = (): ProfileData => ({ v: 1, lessons: {}, srs: {}, topics: {}, seen: {}, mocks: [], timers: {}, drafts: {} });
export const defaultGlobal = (): GlobalData => ({ v: 2, pin: '1234', profiles: [], minutes: {} });

function read<T>(k: string, def: () => T): T {
  try { const s = localStorage.getItem(k); if (!s) return def(); return { ...def(), ...JSON.parse(s) }; } catch { return def(); }
}
export const loadProfile = (id: ProfileId) => read(PKEY(id), emptyProfile);
export const saveProfile = (id: ProfileId, d: ProfileData) => localStorage.setItem(PKEY(id), JSON.stringify(d));
export const removeProfileData = (id: ProfileId) => localStorage.removeItem(PKEY(id));
export const loadGlobal = () => {
  const g = read(GKEY, defaultGlobal);
  if (!Array.isArray(g.profiles)) g.profiles = [];
  g.minutes = g.minutes || {};
  for (const p of g.profiles) g.minutes[p.id] ||= {};
  g.v = 2;
  return g;
};
export const saveGlobal = (g: GlobalData) => localStorage.setItem(GKEY, JSON.stringify(g));

/** Small pub-sub so screens re-render after writes. */
type L = () => void;
const listeners = new Set<L>();
export const subscribe = (l: L) => { listeners.add(l); return () => listeners.delete(l); };
export const notify = () => listeners.forEach((l) => l());

export function updateProfile(id: ProfileId, fn: (d: ProfileData) => void) {
  const d = loadProfile(id); fn(d); saveProfile(id, d); notify();
}
export function updateGlobal(fn: (g: GlobalData) => void) {
  const g = loadGlobal(); fn(g); saveGlobal(g); notify();
}
