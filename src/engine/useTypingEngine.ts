import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  createState,
  reducer,
  type EngineAction,
  type EngineOptions,
  type EngineState,
} from './engine';

export interface TypingEngine {
  state: EngineState;
  /** performance.now() refreshed ~10x/second while running, for live stats. */
  now: number;
  type: (char: string) => void;
  space: () => void;
  backspace: (word?: boolean) => void;
  finish: () => void;
  reset: (words: string[], options: EngineOptions) => void;
  extend: (words: string[]) => void;
}

export function useTypingEngine(
  initialWords: string[],
  options: EngineOptions
): TypingEngine {
  const [state, dispatch] = useReducer(
    (s: EngineState, a: EngineAction) => reducer(s, a),
    undefined,
    () => createState(initialWords, options)
  );
  const [now, setNow] = useState(() => performance.now());

  const running = state.status === 'running';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      dispatch({ type: 'tick', now: t });
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const type = useCallback(
    (char: string) => dispatch({ type: 'char', char, now: performance.now() }),
    []
  );
  const space = useCallback(
    () => dispatch({ type: 'space', now: performance.now() }),
    []
  );
  const backspace = useCallback(
    (word = false) => dispatch({ type: 'backspace', word }),
    []
  );
  const finish = useCallback(
    () => dispatch({ type: 'finish', now: performance.now() }),
    []
  );
  const reset = useCallback(
    (words: string[], opts: EngineOptions) =>
      dispatch({ type: 'reset', words, options: opts }),
    []
  );
  const extend = useCallback(
    (words: string[]) => dispatch({ type: 'extend', words }),
    []
  );

  return { state, now, type, space, backspace, finish, reset, extend };
}
