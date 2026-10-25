import { countChars, type CharCounts, type EngineState, type Sample } from './engine';

export interface Metrics {
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  seconds: number;
  chars: Omit<CharCounts, 'wpmChars' | 'rawChars'>;
  samples: Sample[];
  missedWords: string[];
}

export function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Correct-keystroke percentage. 100 when nothing has been pressed yet. */
export function accuracy(correctKeys: number, incorrectKeys: number): number {
  const total = correctKeys + incorrectKeys;
  return total === 0 ? 100 : (correctKeys / total) * 100;
}

/**
 * Consistency from the coefficient of variation of per-second raw WPM,
 * squashed into 0–100 so that steadier typing scores higher.
 */
export function consistency(values: number[]): number {
  if (values.length < 2) return 100;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, 100 * (1 - Math.tanh(cv + cv ** 3 / 3 + cv ** 5 / 5)));
}

export function elapsed(state: EngineState, now: number): number {
  if (state.startTime === null) return 0;
  const end = state.endTime ?? now;
  return Math.max(0, (end - state.startTime) / 1000);
}

export function liveWpm(state: EngineState, now: number): number {
  const secs = elapsed(state, now);
  if (secs < 1) return 0;
  return countChars(state).wpmChars / 5 / (secs / 60);
}

export function computeMetrics(state: EngineState, now: number): Metrics {
  const seconds = elapsed(state, now);
  const minutes = seconds / 60;
  const counts = countChars(state);
  const wpm = minutes > 0 ? counts.wpmChars / 5 / minutes : 0;
  const raw = minutes > 0 ? counts.rawChars / 5 / minutes : 0;

  const missedWords = state.options.zen
    ? []
    : [...new Set(state.wrongWords.map((i) => state.words[i]).filter(Boolean))];

  return {
    wpm: round(wpm),
    raw: round(raw),
    accuracy: round(accuracy(state.correctKeys, state.incorrectKeys)),
    consistency: round(consistency(state.samples.map((s) => s.raw))),
    seconds: round(seconds, 1),
    chars: {
      correct: counts.correct,
      incorrect: counts.incorrect,
      extra: counts.extra,
      missed: counts.missed,
    },
    samples: state.samples.map((s) => ({
      ...s,
      wpm: round(s.wpm, 1),
      raw: round(s.raw, 1),
    })),
    missedWords,
  };
}
