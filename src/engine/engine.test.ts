import { describe, expect, it } from 'vitest';
import {
  countChars,
  createState,
  reducer,
  type EngineAction,
  type EngineOptions,
  type EngineState,
} from './engine';
import { accuracy, computeMetrics, consistency } from './metrics';

const opts = (o: Partial<EngineOptions> = {}): EngineOptions => ({
  timeLimit: 0,
  stopOnError: 'off',
  backspacePrev: 'incorrect',
  zen: false,
  ...o,
});

/** Types a string where ' ' is a space keypress and '<' is backspace. */
function type(state: EngineState, input: string, now = 1000): EngineState {
  let s = state;
  for (const ch of input) {
    const action: EngineAction =
      ch === ' '
        ? { type: 'space', now }
        : ch === '<'
          ? { type: 'backspace' }
          : { type: 'char', char: ch, now };
    s = reducer(s, action);
  }
  return s;
}

describe('engine', () => {
  it('starts on first keypress and finishes on the last correct word', () => {
    let s = createState(['hello', 'world'], opts());
    expect(s.status).toBe('idle');
    s = type(s, 'h');
    expect(s.status).toBe('running');
    s = type(s, 'ello worl');
    expect(s.status).toBe('running');
    s = type(s, 'd');
    expect(s.status).toBe('finished');
    const c = countChars(s);
    expect(c).toMatchObject({ correct: 11, incorrect: 0, extra: 0, missed: 0 });
  });

  it('tracks incorrect, extra and missed characters', () => {
    let s = createState(['cat', 'dog', 'end'], opts());
    s = type(s, 'cxt dogs e ');
    expect(s.status).toBe('finished');
    const c = countChars(s);
    expect(c.incorrect).toBe(1 + 2); // x, plus spaces after two wrong words
    expect(c.extra).toBe(1); // the trailing "s"
    expect(c.missed).toBe(2); // "nd" never typed
    expect(s.missedKeys).toEqual({ a: 1 });
    expect(s.wrongWords).toEqual([0, 1, 2]);
  });

  it('ignores leading and repeated spaces', () => {
    let s = createState(['a', 'b'], opts());
    s = type(s, '  a  ');
    expect(s.wordIndex).toBe(1);
    expect(s.status).toBe('running');
  });

  it('backspaces into an incorrect previous word but not a correct one', () => {
    let s = createState(['one', 'two', 'six'], opts());
    s = type(s, 'one <');
    expect(s.wordIndex).toBe(1); // "one" was correct: locked
    s = type(s, 'twx <');
    expect(s.wordIndex).toBe(1);
    expect(s.typed[1]).toBe('twx');
    s = type(s, '<o six');
    expect(s.status).toBe('finished');
    expect(s.wrongWords).toEqual([]);
  });

  it('allows going back over correct words when backspacePrev is always', () => {
    let s = createState(['one', 'two'], opts({ backspacePrev: 'always' }));
    s = type(s, 'one <');
    expect(s.wordIndex).toBe(0);
  });

  it('stop on letter blocks wrong characters', () => {
    let s = createState(['abc'], opts({ stopOnError: 'letter' }));
    s = type(s, 'axbc');
    expect(s.typed[0]).toBe('abc');
    expect(s.status).toBe('finished');
    expect(s.incorrectKeys).toBe(1);
  });

  it('stop on word blocks space until the word is correct', () => {
    let s = createState(['ab', 'cd'], opts({ stopOnError: 'word' }));
    s = type(s, 'ax ');
    expect(s.wordIndex).toBe(0);
    s = type(s, '<b cd');
    expect(s.status).toBe('finished');
  });

  it('finishes a timed test at the limit and records per-second samples', () => {
    let s = createState(['aa', 'bb', 'cc', 'dd'], opts({ timeLimit: 3 }));
    s = type(s, 'a', 0);
    s = type(s, 'a bb', 500);
    s = reducer(s, { type: 'tick', now: 1000 });
    s = reducer(s, { type: 'tick', now: 2000 });
    expect(s.status).toBe('running');
    s = reducer(s, { type: 'tick', now: 3200 });
    expect(s.status).toBe('finished');
    expect(s.endTime).toBe(3000);
    expect(s.samples.map((x) => x.t)).toEqual([1, 2, 3]);
  });

  it('extends words for timed tests', () => {
    let s = createState(['a'], opts({ timeLimit: 30 }));
    s = reducer(s, { type: 'extend', words: ['b', 'c'] });
    expect(s.words).toEqual(['a', 'b', 'c']);
  });

  it('zen mode treats everything as correct', () => {
    let s = createState([], opts({ zen: true }));
    s = type(s, 'anything goes ');
    expect(s.incorrectKeys).toBe(0);
    expect(s.typed).toEqual(['anything', 'goes', '']);
    s = reducer(s, { type: 'finish', now: 61000 });
    expect(s.status).toBe('finished');
  });

  it('computes wpm from correct words over elapsed time', () => {
    // 10 correct 4-letter words + 9 spaces = 49 chars in 12s.
    const words = Array(10).fill('abcd');
    let s = createState(words, opts());
    s = type(s, 'a', 0);
    s = type(s, 'bcd ' + Array(9).fill('abcd').join(' '), 12000);
    expect(s.status).toBe('finished');
    const m = computeMetrics(s, 12000);
    expect(m.wpm).toBeCloseTo(49 / 5 / 0.2, 1);
    expect(m.accuracy).toBe(100);
  });
});

describe('metrics', () => {
  it('accuracy handles zero keystrokes', () => {
    expect(accuracy(0, 0)).toBe(100);
    expect(accuracy(9, 1)).toBe(90);
  });

  it('consistency is 100 for perfectly steady typing and lower when erratic', () => {
    expect(consistency([60, 60, 60])).toBeCloseTo(100);
    expect(consistency([20, 100, 30, 90])).toBeLessThan(70);
  });
});

describe('sanitizeGenerated', () => {
  it('strips preambles, markdown, and wrapping quotes', async () => {
    const { sanitizeGenerated } = await import('../ai/promptBuilder');
    expect(
      sanitizeGenerated('Here is your paragraph:\n\n"The **quick** fox — it’s fast."')
    ).toBe("The quick fox - it's fast.");
    expect(sanitizeGenerated('# Title\nJust the text here, folks.')).toBe(
      'Just the text here, folks.'
    );
  });
});
