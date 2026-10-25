import { LIBRARY } from '../data/library';
import english200 from '../data/words/english-200.json';
import english1k from '../data/words/english-1k.json';
import code from '../data/words/code.json';
import {
  lengthBucket,
  type LibraryText,
  type TextRef,
  type UserText,
  type WordList,
} from '../lib/types';

const LISTS: Record<WordList, string[]> = {
  'english-200': english200,
  'english-1k': english1k,
  code,
};

export interface WordOptions {
  list: WordList;
  punctuation: boolean;
  numbers: boolean;
  lowercase: boolean;
}

export interface ResolvedText {
  title: string;
  text: string;
  /** Library id or user text id, for personal bests and categories. */
  id?: string;
  category?: LibraryText['category'];
  isDaily?: boolean;
}

/** Small deterministic PRNG so the daily text is the same for everyone. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same text for everyone on a given local calendar day. */
export function dailyText(day: string): LibraryText {
  const pool = LIBRARY.filter((t) => lengthBucket(t.text) !== 'short');
  return pool[hashString(day) % pool.length];
}

const pick = <T,>(arr: T[], rnd: () => number): T =>
  arr[Math.floor(rnd() * arr.length)];

function decorate(
  words: string[],
  { punctuation, numbers, lowercase }: Omit<WordOptions, 'list'>,
  rnd: () => number
): string[] {
  const out = words.map((w) => (lowercase ? w.toLowerCase() : w));
  if (numbers) {
    for (let i = 0; i < out.length; i++) {
      if (rnd() < 0.1) out[i] = String(Math.floor(rnd() * 1000));
    }
  }
  if (punctuation) {
    let capitalizeNext = true;
    for (let i = 0; i < out.length; i++) {
      if (capitalizeNext && !lowercase) {
        out[i] = out[i][0].toUpperCase() + out[i].slice(1);
        capitalizeNext = false;
      }
      const r = rnd();
      if (i === out.length - 1 || r < 0.08) {
        out[i] += pick(['.', '.', '.', '?', '!'], rnd);
        capitalizeNext = true;
      } else if (r < 0.16) {
        out[i] += ',';
      } else if (r < 0.19) {
        out[i] = `"${out[i]}"`;
      } else if (r < 0.21 && i < out.length - 1) {
        out[i] += ';';
      }
    }
  }
  return out;
}

/** Random words from a list, with optional punctuation/numbers/case. */
export function generateWords(
  count: number,
  opts: WordOptions,
  rnd: () => number = Math.random
): string[] {
  const list = LISTS[opts.list];
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = pick(list, rnd);
    // Avoid immediate repeats; they feel like typos.
    if (i > 0 && w === words[i - 1]) w = pick(list, rnd);
    words.push(w);
  }
  return decorate(words, opts, rnd);
}

/** A drill built from words the user missed, repeated and shuffled. */
export function practiceWords(missed: string[], count = 30): string[] {
  const clean = [...new Set(missed.map((w) => w.trim()).filter(Boolean))];
  if (clean.length === 0) return [];
  const out: string[] = [];
  while (out.length < count) {
    const shuffled = [...clean].sort(() => Math.random() - 0.5);
    for (const w of shuffled) {
      if (out.length < count) out.push(w);
    }
  }
  return out;
}

export function resolveText(
  ref: TextRef,
  userTexts: UserText[],
  today: string
): ResolvedText {
  switch (ref.kind) {
    case 'library': {
      const t = LIBRARY.find((x) => x.id === ref.id);
      if (t) return { title: t.title, text: t.text, id: t.id, category: t.category };
      break;
    }
    case 'user': {
      const t = userTexts.find((x) => x.id === ref.id);
      if (t) return { title: t.title, text: t.text, id: t.id };
      break;
    }
    case 'daily': {
      const t = dailyText(today);
      return {
        title: `Daily: ${t.title}`,
        text: t.text,
        id: t.id,
        category: t.category,
        isDaily: true,
      };
    }
    case 'adhoc':
      return { title: ref.title, text: ref.text };
    case 'random':
      break;
  }
  const pool = LIBRARY.filter(
    (t) =>
      ref.kind !== 'random' ||
      ((!ref.category || t.category === ref.category) &&
        (!ref.length || lengthBucket(t.text) === ref.length))
  );
  const t = pick(pool.length ? pool : LIBRARY, Math.random);
  return { title: t.title, text: t.text, id: t.id, category: t.category };
}

export function textToWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}
