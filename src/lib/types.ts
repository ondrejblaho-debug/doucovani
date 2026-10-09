export type Subject = 'cestina' | 'matematika' | 'extra';
export type Kind = 'mc' | 'yn' | 'yng' | 'gap' | 'num' | 'text' | 'match' | 'order';

export interface Task {
  id: string;
  topic: string;
  subject: Subject;
  grade: 5 | 7;
  kind: Kind;
  prompt: string;
  passage?: string; // passage id
  options?: string[]; // mc, gap (correct index in `correct`)
  correct?: number;
  gapText?: [string, string]; // gap: text before / after the blank
  answer?: boolean; // yn
  statements?: { s: string; a: boolean }[]; // yng
  answers?: string[]; // num, text accepted answers
  caseSensitive?: boolean;
  unit?: string; // num: unit shown after the input
  pairs?: [string, string][]; // match
  items?: string[]; // order: correct order
  explain: string;
  diff: 1 | 2 | 3;
  gen?: string; // generator id when generated
  strict?: boolean; // num: compare as exact normalized string (e.g. reduced fraction)
  meta?: Record<string, unknown>; // generator parameters for validation
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  audio?: boolean; // listening: read aloud by speech synthesis, transcript hidden until answered
}

export interface Bank {
  tasks: Task[];
  passages: Record<string, Passage>;
}
