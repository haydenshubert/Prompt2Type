import type { EngineState } from '../engine/engine';
import { elapsed, liveWpm } from '../engine/metrics';

interface Props {
  state: EngineState;
  now: number;
  showWpm: boolean;
  /** Words in a fixed-length test, or 0. */
  totalWords: number;
}

export function LiveStats({ state, now, showWpm, totalWords }: Props) {
  const { timeLimit, zen } = state.options;
  const secs = elapsed(state, now);
  const left = Math.max(0, Math.ceil(timeLimit - secs));
  const primary =
    timeLimit > 0
      ? `${left}`
      : zen
        ? `${state.wordIndex}`
        : `${Math.min(state.wordIndex, totalWords)}/${totalWords}`;

  return (
    <div
      className="flex h-9 items-baseline justify-center gap-6 font-typing text-2xl text-main"
      aria-live="off"
    >
      <span className={state.status === 'idle' ? 'opacity-40' : ''}>{primary}</span>
      {showWpm && state.status === 'running' && (
        <span className="text-lg text-sub">{Math.round(liveWpm(state, now))} wpm</span>
      )}
    </div>
  );
}
