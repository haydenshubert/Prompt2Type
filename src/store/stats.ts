import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, UserText } from '../lib/types';

export interface ResultRecord {
  id: string;
  at: number;
  /** Stable key for the test config, used for personal bests. */
  configKey: string;
  configLabel: string;
  mode: string;
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  seconds: number;
  category?: Category;
  textId?: string;
  isDaily?: boolean;
  failed?: boolean;
  missedWords: string[];
  missedKeys: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  check: (s: StatsData) => boolean;
}

export interface StatsData {
  history: ResultRecord[];
  bests: Record<string, number>;
  favorites: string[];
  userTexts: UserText[];
  unlocked: Record<string, number>;
}

export const dayKey = (t: number | Date = Date.now()): string => {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Consecutive days with at least one test, ending today or yesterday. */
export function currentStreak(history: ResultRecord[], now = Date.now()): number {
  const days = new Set(history.map((r) => dayKey(r.at)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function bestStreak(history: ResultRecord[]): number {
  const days = [...new Set(history.map((r) => dayKey(r.at)))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = new Date(d + 'T00:00:00');
    run =
      prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1
        ? run + 1
        : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

const good = (s: StatsData) => s.history.filter((r) => !r.failed);
const maxWpm = (s: StatsData) =>
  Math.max(0, ...good(s).map((r) => r.wpm));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'First keystrokes', description: 'Finish your first test', check: (s) => s.history.length >= 1 },
  { id: 'ten', name: 'Warming up', description: 'Finish 10 tests', check: (s) => s.history.length >= 10 },
  { id: 'fifty', name: 'Regular', description: 'Finish 50 tests', check: (s) => s.history.length >= 50 },
  { id: 'hundred', name: 'Centurion', description: 'Finish 100 tests', check: (s) => s.history.length >= 100 },
  { id: 'wpm40', name: 'Getting quick', description: 'Reach 40 WPM', check: (s) => maxWpm(s) >= 40 },
  { id: 'wpm60', name: 'Fast fingers', description: 'Reach 60 WPM', check: (s) => maxWpm(s) >= 60 },
  { id: 'wpm80', name: 'Speed demon', description: 'Reach 80 WPM', check: (s) => maxWpm(s) >= 80 },
  { id: 'wpm100', name: 'Triple digits', description: 'Reach 100 WPM', check: (s) => maxWpm(s) >= 100 },
  { id: 'perfect', name: 'Flawless', description: '100% accuracy on a test of 10s or longer', check: (s) => s.history.some((r) => r.accuracy === 100 && r.seconds >= 10) },
  { id: 'steady', name: 'Metronome', description: '90%+ consistency at 40+ WPM', check: (s) => s.history.some((r) => r.consistency >= 90 && r.wpm >= 40 && !r.failed) },
  { id: 'streak3', name: 'On a roll', description: 'Type 3 days in a row', check: (s) => bestStreak(s.history) >= 3 },
  { id: 'streak7', name: 'Week warrior', description: 'Type 7 days in a row', check: (s) => bestStreak(s.history) >= 7 },
  { id: 'daily', name: 'Daily driver', description: 'Complete the daily text', check: (s) => s.history.some((r) => r.isDaily) },
  { id: 'explorer', name: 'Bookworm', description: 'Type texts from 5 different categories', check: (s) => new Set(s.history.map((r) => r.category).filter(Boolean)).size >= 5 },
  { id: 'ai', name: 'Machine muse', description: 'Type an AI-generated text', check: (s) => s.history.some((r) => r.mode === 'ai') },
];

interface StatsStore extends StatsData {
  /** Saves a result; returns the new personal best flag and newly unlocked achievements. */
  addResult: (r: ResultRecord) => { newBest: boolean; unlocked: Achievement[] };
  toggleFavorite: (id: string) => void;
  addUserText: (t: Omit<UserText, 'id' | 'createdAt'>) => UserText;
  removeUserText: (id: string) => void;
  exportData: () => string;
  importData: (json: string) => void;
  clearHistory: () => void;
}

const empty: StatsData = {
  history: [],
  bests: {},
  favorites: [],
  userTexts: [],
  unlocked: {},
};

const MAX_HISTORY = 2000;

export const useStats = create<StatsStore>()(
  persist(
    (set, get) => ({
      ...empty,
      addResult: (r) => {
        const prevBest = get().bests[r.configKey] ?? 0;
        const newBest = !r.failed && r.wpm > prevBest;
        const history = [...get().history, r].slice(-MAX_HISTORY);
        const bests = newBest
          ? { ...get().bests, [r.configKey]: r.wpm }
          : get().bests;
        const next: StatsData = { ...get(), history, bests };
        const unlocked: Achievement[] = [];
        const unlockedMap = { ...get().unlocked };
        for (const a of ACHIEVEMENTS) {
          if (!unlockedMap[a.id] && a.check(next)) {
            unlockedMap[a.id] = r.at;
            unlocked.push(a);
          }
        }
        set({ history, bests, unlocked: unlockedMap });
        return { newBest, unlocked };
      },
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
      addUserText: (t) => {
        const text: UserText = {
          ...t,
          id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          createdAt: Date.now(),
        };
        set((s) => ({ userTexts: [text, ...s.userTexts] }));
        return text;
      },
      removeUserText: (id) =>
        set((s) => ({ userTexts: s.userTexts.filter((t) => t.id !== id) })),
      exportData: () => {
        const { history, bests, favorites, userTexts, unlocked } = get();
        return JSON.stringify(
          { history, bests, favorites, userTexts, unlocked },
          null,
          2
        );
      },
      importData: (json) => {
        const d = JSON.parse(json) as Partial<StatsData>;
        if (!Array.isArray(d.history)) throw new Error('Not a Prompt2Type export');
        set({
          history: d.history,
          bests: d.bests ?? {},
          favorites: d.favorites ?? [],
          userTexts: d.userTexts ?? [],
          unlocked: d.unlocked ?? {},
        });
      },
      clearHistory: () => set({ ...empty }),
    }),
    {
      name: 'p2t-stats',
      version: 1,
      partialize: (s) => ({
        history: s.history,
        bests: s.bests,
        favorites: s.favorites,
        userTexts: s.userTexts,
        unlocked: s.unlocked,
      }),
    }
  )
);
