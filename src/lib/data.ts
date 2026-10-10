import curriculum from '../generated/curriculum.json';
import keys from '../generated/keys.json';
import bankJson from '../generated/bank.json';
import type { Bank, Task } from './types';

import { loadGlobal } from './store';

export type ProfileId = string;
export type TrackId = 'g8' | 'g6';
export interface Profile {
  id: ProfileId; name: string; emoji: string; color: string; soft: string;
  track: TrackId; // g8 = 5. třída → 8leté gymnázium, g6 = 7. třída → 6leté gymnázium
  zkk: boolean; // g8: school test in basics of Christian culture
  english: boolean; // g6: school English test
  school?: string; // optional, shown only on the device
}
export const COLORS: [string, string][] = [['#5b6ab0', ''], ['#3f8f86', ''], ['#b8734f', ''], ['#a65b7a', ''], ['#4d7fb8', ''], ['#6f8f5a', '']];
export const EMOJIS = ['🦊', '🐬', '🦄', '🐼', '🐱', '🦉', '🐢', '🐝', '🌸', '⭐', '🚀', '🎨'];
const FALLBACK: Profile = { id: '?', name: 'Profil', emoji: '🙂', color: '#5c6bc0', soft: '#eef0fb', track: 'g8', zkk: false, english: false };
export const profiles = () => loadGlobal().profiles;
export const profileMeta = (id: ProfileId): Profile => profiles().find((p) => p.id === id) || FALLBACK;
export const newProfileId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export interface Week { weekNumber: number; weekStart: string; weekEnd: string; phase: string; matematika: { topics: string[] }; cestina: { topics: string[] }; extra: { topics: string[] }; note?: string }
export interface MockDef { date: string; gradeLevel: number; label: string; note: string; testYear: number; testTerm: string; durations: { cestina: number; matematika: number } }
export interface EnglishPlan { regular: Record<string, number>; ostry: Record<string, number>; ostryFrom: string; until: string }
export interface Student { id: TrackId; label: string; grade: 5 | 7; schoolType: string; examDates: Record<string, any>; dailyTemplate: Record<string, { subject: string; minutes: number }[]>; dailyTemplateNote?: string; englishPlan?: EnglishPlan; weeks: Week[]; mockTests: MockDef[] }
export interface TopicDef { id: string; name: string; description: string }
export interface KeyPart { n: string; type: 'yn' | 'open' | 'choice'; answer: string | null; pts?: number | null }
export interface KeyItem { n: string; max: number; type: 'choice' | 'open' | 'group' | 'parts' | 'order'; answer?: string | string[] | null; parts?: KeyPart[]; grp?: Record<string, number>; keyText?: string; constr?: number; selfItem?: number }
export interface TestKey { id: string; subject: 'cestina' | 'matematika'; grade: 5 | 7; year: number; termCode: 'A' | 'B'; term: string; durationMin: number; tsUrl: string; ksrUrl: string; maxPoints: number; items: KeyItem[]; keySource: string }

export const CUR = curriculum as any;
export const STUDENTS = CUR.students as Student[];
export const TRACKS = STUDENTS;
const isTrack = (id: string): id is TrackId => id === 'g8' || id === 'g6';
/** Curriculum track for a profile id (or a track id directly). */
export const student = (id: ProfileId | TrackId) => STUDENTS.find((s) => s.id === (isTrack(id) ? id : profileMeta(id).track))!;
export const PHASES = CUR.phases as { id: string; name: string; start: string; end: string; goal: string }[];
export const KEYS = keys as unknown as TestKey[];
export const BANK = bankJson as unknown as Bank;

const topicIndex: Record<string, TopicDef & { grade: 5 | 7; subject: string }> = {};
for (const g of Object.keys(CUR.topicCatalog)) for (const subj of Object.keys(CUR.topicCatalog[g])) for (const t of CUR.topicCatalog[g][subj]) topicIndex[t.id] = { ...t, grade: Number(g) as 5 | 7, subject: subj };
export const topic = (id: string) => topicIndex[id];
export const topicsFor = (grade: 5 | 7) => Object.values(topicIndex).filter((t) => t.grade === grade);

export const STATIC_BY_TOPIC: Record<string, Task[]> = {};
for (const t of BANK.tasks) (STATIC_BY_TOPIC[t.topic] ||= []).push(t);
export const STATIC_BY_ID: Record<string, Task> = Object.fromEntries(BANK.tasks.map((t) => [t.id, t]));

export function findKey(grade: number, subject: 'cestina' | 'matematika', year: number, term: string): TestKey | undefined {
  const code = term.startsWith('1') ? 'A' : 'B';
  return KEYS.find((k) => k.grade === grade && k.subject === subject && k.year === year && k.termCode === code);
}
