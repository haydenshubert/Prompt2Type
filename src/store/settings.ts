import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackspacePrev, StopOnError } from '../engine/engine';
import type { Mode, TextRef, WordList } from '../lib/types';

export type CaretStyle = 'line' | 'block' | 'underline';
export type ProviderId = 'ollama' | 'anthropic' | 'openai';

export interface Settings {
  // test configuration
  mode: Mode;
  timeLimit: number;
  wordCount: number;
  wordList: WordList;
  punctuation: boolean;
  numbers: boolean;
  lowercase: boolean;
  textRef: TextRef;
  // behaviour
  stopOnError: StopOnError;
  backspacePrev: BackspacePrev;
  blindMode: boolean;
  minAccuracy: number; // 0 = off; results below this are marked failed
  // appearance
  theme: string;
  font: string;
  fontSize: number; // rem
  caret: CaretStyle;
  liveStats: boolean;
  sound: boolean;
  // ai
  provider: ProviderId;
  ollamaUrl: string;
  ollamaModel: string;
  anthropicKey: string;
  anthropicModel: string;
  openaiUrl: string;
  openaiKey: string;
  openaiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'time',
  timeLimit: 30,
  wordCount: 25,
  wordList: 'english-200',
  punctuation: false,
  numbers: false,
  lowercase: false,
  textRef: { kind: 'random' },
  stopOnError: 'off',
  backspacePrev: 'incorrect',
  blindMode: false,
  minAccuracy: 0,
  theme: 'carbon',
  font: 'jetbrains',
  fontSize: 1.75,
  caret: 'line',
  liveStats: true,
  sound: false,
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  anthropicKey: '',
  anthropicModel: 'claude-haiku-5-5',
  openaiUrl: 'https://api.openai.com/v1',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
};

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: 'p2t-settings',
      version: 1,
      partialize: (s) => {
        const { set: _set, reset: _reset, ...rest } = s;
        return rest;
      },
    }
  )
);
