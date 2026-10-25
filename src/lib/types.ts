export type Mode = 'time' | 'words' | 'text' | 'zen';
export type WordList = 'english-200' | 'english-1k' | 'code';
export type Category =
  | 'stories'
  | 'science'
  | 'history'
  | 'quotes'
  | 'twisters'
  | 'tech'
  | 'weird'
  | 'fables';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type LengthBucket = 'short' | 'medium' | 'long';

export interface LibraryText {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  text: string;
  source?: string;
}

export interface UserText {
  id: string;
  title: string;
  text: string;
  origin: 'custom' | 'ai';
  createdAt: number;
}

/** Where the text of a "text" mode test comes from. */
export type TextRef =
  | { kind: 'library'; id: string }
  | { kind: 'user'; id: string }
  | { kind: 'daily' }
  | { kind: 'random'; category?: Category; length?: LengthBucket }
  | {
      kind: 'adhoc';
      title: string;
      text: string;
      origin?: 'ai' | 'custom';
    };

export const CATEGORY_LABELS: Record<Category, string> = {
  stories: 'Short stories',
  science: 'Science & facts',
  history: 'History',
  quotes: 'Quotes',
  twisters: 'Tongue twisters',
  tech: 'Tech & code',
  weird: 'Weird & wonderful',
  fables: 'Fables',
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function lengthBucket(text: string): LengthBucket {
  const n = wordCount(text);
  return n < 40 ? 'short' : n < 100 ? 'medium' : 'long';
}
