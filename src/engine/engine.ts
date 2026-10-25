/**
 * Pure typing-test state machine. All timing comes in through actions so the
 * reducer is deterministic and unit-testable; the React hook (useTypingEngine)
 * supplies performance.now() timestamps.
 */

export type StopOnError = 'off' | 'letter' | 'word';
export type BackspacePrev = 'never' | 'incorrect' | 'always';

export interface EngineOptions {
  /** Seconds; 0 means the test ends when the text runs out. */
  timeLimit: number;
  stopOnError: StopOnError;
  backspacePrev: BackspacePrev;
  /** Zen mode: no target text, everything typed is correct. */
  zen: boolean;
}

export interface Sample {
  /** Second index (1-based). */
  t: number;
  wpm: number;
  raw: number;
  errors: number;
}

export type Status = 'idle' | 'running' | 'finished';

export interface EngineState {
  words: string[];
  typed: string[];
  wordIndex: number;
  status: Status;
  startTime: number | null;
  endTime: number | null;
  correctKeys: number;
  incorrectKeys: number;
  /** Target character -> number of times it was mistyped. */
  missedKeys: Record<string, number>;
  /** Indices of committed words that didn't match. */
  wrongWords: number[];
  samples: Sample[];
  errorsSinceSample: number;
  options: EngineOptions;
}

export type EngineAction =
  | { type: 'reset'; words: string[]; options: EngineOptions }
  | { type: 'extend'; words: string[] }
  | { type: 'char'; char: string; now: number }
  | { type: 'space'; now: number }
  | { type: 'backspace'; word?: boolean }
  | { type: 'tick'; now: number }
  | { type: 'finish'; now: number };

export function createState(
  words: string[],
  options: EngineOptions
): EngineState {
  return {
    words,
    typed: [''],
    wordIndex: 0,
    status: 'idle',
    startTime: null,
    endTime: null,
    correctKeys: 0,
    incorrectKeys: 0,
    missedKeys: {},
    wrongWords: [],
    samples: [],
    errorsSinceSample: 0,
    options,
  };
}

function target(state: EngineState, i = state.wordIndex): string {
  if (state.options.zen) return state.typed[i] ?? '';
  return state.words[i] ?? '';
}

function isLastWord(state: EngineState): boolean {
  return !state.options.zen && state.wordIndex >= state.words.length - 1;
}

function start(state: EngineState, now: number): EngineState {
  if (state.status !== 'idle') return state;
  return { ...state, status: 'running', startTime: now };
}

function finish(state: EngineState, now: number): EngineState {
  if (state.status !== 'running') return state;
  const done = { ...state, status: 'finished' as const, endTime: now };
  return addSample(done, now, true);
}

function elapsedSeconds(state: EngineState, now: number): number {
  if (state.startTime === null) return 0;
  return Math.max(0, (now - state.startTime) / 1000);
}

function addSample(
  state: EngineState,
  now: number,
  partial = false
): EngineState {
  const secs = elapsedSeconds(state, now);
  const t = partial ? state.samples.length + 1 : Math.floor(secs);
  if (t <= 0 || (!partial && t <= state.samples.length)) return state;
  // A partial final sample of less than half a second is too noisy to chart.
  if (partial && secs - state.samples.length < 0.5 && state.samples.length > 0)
    return state;
  const counts = countChars(state);
  const minutes = secs / 60;
  return {
    ...state,
    samples: [
      ...state.samples,
      {
        t,
        wpm: minutes > 0 ? counts.wpmChars / 5 / minutes : 0,
        raw: minutes > 0 ? counts.rawChars / 5 / minutes : 0,
        errors: state.errorsSinceSample,
      },
    ],
    errorsSinceSample: 0,
  };
}

function recordError(state: EngineState, expected: string | undefined) {
  const missedKeys = { ...state.missedKeys };
  if (expected) missedKeys[expected] = (missedKeys[expected] ?? 0) + 1;
  return {
    incorrectKeys: state.incorrectKeys + 1,
    errorsSinceSample: state.errorsSinceSample + 1,
    missedKeys,
  };
}

function typeChar(state: EngineState, char: string, now: number): EngineState {
  if (state.status === 'finished') return state;
  let s = start(state, now);
  const current = s.typed[s.wordIndex] ?? '';

  if (s.options.zen) {
    const typed = [...s.typed];
    typed[s.wordIndex] = current + char;
    return { ...s, typed, correctKeys: s.correctKeys + 1 };
  }

  const word = target(s);
  // Cap extra characters so a stuck key can't build an endless word.
  if (current.length >= word.length + 20) return s;

  const expected = word[current.length];
  const correct = char === expected;
  if (correct) {
    s = { ...s, correctKeys: s.correctKeys + 1 };
  } else {
    s = { ...s, ...recordError(s, expected) };
    if (s.options.stopOnError === 'letter') return s;
  }

  const typed = [...s.typed];
  typed[s.wordIndex] = current + char;
  s = { ...s, typed };

  // The final word finishes the test as soon as it is typed correctly.
  if (isLastWord(s) && typed[s.wordIndex] === word) {
    return finish(s, now);
  }
  return s;
}

function space(state: EngineState, now: number): EngineState {
  if (state.status === 'finished') return state;
  const current = state.typed[state.wordIndex] ?? '';
  if (current.length === 0) return state; // ignore leading/double spaces
  let s = start(state, now);

  if (s.options.zen) {
    return {
      ...s,
      typed: [...s.typed, ''],
      wordIndex: s.wordIndex + 1,
      correctKeys: s.correctKeys + 1,
    };
  }

  const word = target(s);
  const correct = current === word;
  if (!correct && s.options.stopOnError === 'word') {
    return { ...s, ...recordError(s, ' ') };
  }

  s = correct
    ? { ...s, correctKeys: s.correctKeys + 1 }
    : {
        ...s,
        ...recordError(s, undefined),
        wrongWords: [...s.wrongWords, s.wordIndex],
      };

  if (isLastWord(s)) {
    return finish(s, now);
  }
  return {
    ...s,
    typed: [...s.typed, ''],
    wordIndex: s.wordIndex + 1,
  };
}

function backspace(state: EngineState, wholeWord: boolean): EngineState {
  if (state.status === 'finished') return state;
  const current = state.typed[state.wordIndex] ?? '';

  if (current.length > 0) {
    const typed = [...state.typed];
    typed[state.wordIndex] = wholeWord ? '' : current.slice(0, -1);
    return { ...state, typed };
  }

  // At the start of a word: maybe step back into the previous one.
  if (state.wordIndex === 0) return state;
  const prev = state.wordIndex - 1;
  const prevWasWrong = state.wrongWords.includes(prev);
  const allowed =
    state.options.zen ||
    state.options.backspacePrev === 'always' ||
    (state.options.backspacePrev === 'incorrect' && prevWasWrong);
  if (!allowed) return state;

  const typed = state.typed.slice(0, prev + 1);
  if (wholeWord) typed[prev] = '';
  return {
    ...state,
    typed,
    wordIndex: prev,
    wrongWords: state.wrongWords.filter((i) => i !== prev),
  };
}

export function reducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'reset':
      return createState(action.words, action.options);
    case 'extend':
      return { ...state, words: [...state.words, ...action.words] };
    case 'char':
      return typeChar(state, action.char, action.now);
    case 'space':
      return space(state, action.now);
    case 'backspace':
      return backspace(state, action.word ?? false);
    case 'tick': {
      if (state.status !== 'running') return state;
      const limit = state.options.timeLimit;
      if (limit > 0 && elapsedSeconds(state, action.now) >= limit) {
        const end = (state.startTime ?? action.now) + limit * 1000;
        // Record any whole seconds we missed before finishing.
        let s = state;
        while (s.samples.length < limit) {
          const before = s.samples.length;
          s = addSample(s, (s.startTime ?? 0) + (before + 1) * 1000);
          if (s.samples.length === before) break;
        }
        return { ...s, status: 'finished', endTime: end };
      }
      return addSample(state, action.now);
    }
    case 'finish':
      return finish(state, action.now);
  }
}

export interface CharCounts {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
  /** Characters that count toward net WPM (correct words + their spaces). */
  wpmChars: number;
  /** Every typed character plus spaces between committed words. */
  rawChars: number;
}

/**
 * Character tallies in the standard typing-test sense: only fully correct
 * words (plus the space after them) count toward WPM, while raw counts
 * everything typed.
 */
export function countChars(state: EngineState): CharCounts {
  const c: CharCounts = {
    correct: 0,
    incorrect: 0,
    extra: 0,
    missed: 0,
    wpmChars: 0,
    rawChars: 0,
  };
  const finished = state.status === 'finished';
  for (let i = 0; i <= state.wordIndex; i++) {
    const typed = state.typed[i] ?? '';
    const word = target(state, i);
    // A word in progress when the clock runs out isn't "missing" letters.
    const committed =
      i < state.wordIndex ||
      (finished && state.options.timeLimit === 0 && !state.options.zen);
    const isCurrent = i === state.wordIndex;

    for (let j = 0; j < Math.max(word.length, typed.length); j++) {
      if (j >= typed.length) {
        if (committed) c.missed++;
      } else if (j >= word.length) c.extra++;
      else if (typed[j] === word[j]) c.correct++;
      else c.incorrect++;
    }

    const hasSpace = i < state.wordIndex;
    c.rawChars += typed.length + (hasSpace ? 1 : 0);
    if (typed === word && typed.length > 0) {
      c.wpmChars += typed.length + (hasSpace ? 1 : 0);
    } else if (isCurrent && word.startsWith(typed)) {
      // Credit the correctly-typed prefix of the word in progress.
      c.wpmChars += typed.length;
    }
    if (hasSpace) {
      if (typed === word) c.correct++;
      else c.incorrect++;
    }
  }
  return c;
}
