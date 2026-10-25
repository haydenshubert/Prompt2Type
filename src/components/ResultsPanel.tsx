import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Dumbbell, RotateCcw, Trophy } from 'lucide-react';
import type { Metrics } from '../engine/metrics';
import type { Achievement } from '../store/stats';

interface Props {
  metrics: Metrics;
  label: string;
  best: number;
  newBest: boolean;
  failed: boolean;
  minAccuracy: number;
  unlocked: Achievement[];
  onRetry: () => void;
  onNext: () => void;
  onPractice?: () => void;
}

function Stat({
  label,
  value,
  big,
  small,
}: {
  label: string;
  value: string | number;
  big?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-sub">{label}</div>
      <div
        className={
          'font-typing text-main ' +
          (big ? 'text-6xl' : small ? 'break-words text-lg leading-snug' : 'text-3xl')
        }
      >
        {value}
      </div>
    </div>
  );
}

export function ResultsPanel({
  metrics: m,
  label,
  best,
  newBest,
  failed,
  minAccuracy,
  unlocked,
  onRetry,
  onNext,
  onPractice,
}: Props) {
  const c = m.chars;
  return (
    <div className="fade-up mx-auto w-full max-w-4xl" data-testid="results">
      {failed && (
        <p className="mb-4 rounded-lg bg-error/20 px-4 py-2 text-center text-error">
          Failed: accuracy was below your {minAccuracy}% minimum.
        </p>
      )}
      {newBest && (
        <p className="pop-in mb-4 flex items-center justify-center gap-2 text-center text-lg text-main">
          <Trophy className="h-5 w-5" /> New personal best for {label}!
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex gap-8 sm:flex-col sm:gap-4">
          <Stat label="wpm" value={Math.round(m.wpm)} big />
          <Stat label="acc" value={`${Math.round(m.accuracy)}%`} big />
        </div>
        <div className="col-span-2 h-48 sm:col-span-1 sm:h-auto sm:min-h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={m.samples} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--sub)" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="t" stroke="var(--sub)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--sub)" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--panel)', border: 'none', borderRadius: 8, color: 'var(--text)' }}
                labelFormatter={(t) => `second ${t}`}
              />
              <Bar dataKey="errors" fill="var(--error)" barSize={6} />
              <Line type="monotone" dataKey="raw" stroke="var(--sub)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="wpm" stroke="var(--main)" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="test" value={label} small />
        <Stat label="raw" value={Math.round(m.raw)} />
        <Stat label="consistency" value={`${Math.round(m.consistency)}%`} />
        <Stat label="time" value={`${Math.round(m.seconds)}s`} />
        <div>
          <div className="text-sm text-sub">characters</div>
          <div
            className="font-typing text-3xl text-main"
            title="correct / incorrect / extra / missed"
          >
            {c.correct}/{c.incorrect}/{c.extra}/{c.missed}
          </div>
        </div>
      </div>
      {best > 0 && !newBest && (
        <p className="mt-4 text-sm text-sub">Personal best for this test: {Math.round(best)} wpm</p>
      )}

      {unlocked.length > 0 && (
        <ul className="mt-6 space-y-2">
          {unlocked.map((a) => (
            <li key={a.id} className="pop-in flex items-center gap-3 rounded-lg bg-panel px-4 py-2">
              <Trophy className="h-5 w-5 text-main" />
              <span>
                <b className="text-main">{a.name}</b>
                <span className="text-sub"> – {a.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {m.missedWords.length > 0 && (
        <div className="mt-6">
          <div className="text-sm text-sub">words to practice</div>
          <p className="mt-1 font-typing text-error">{m.missedWords.slice(0, 12).join('  ')}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={onRetry} className="flex items-center gap-2 rounded-lg bg-panel px-4 py-2 hover:text-main">
          <RotateCcw className="h-4 w-4" /> retry <kbd className="text-xs text-sub">tab</kbd>
        </button>
        <button onClick={onNext} className="flex items-center gap-2 rounded-lg bg-main px-4 py-2 text-bg hover:opacity-90">
          <ArrowRight className="h-4 w-4" /> next test <kbd className="text-xs opacity-70">enter</kbd>
        </button>
        {onPractice && m.missedWords.length > 0 && (
          <button onClick={onPractice} className="flex items-center gap-2 rounded-lg bg-panel px-4 py-2 hover:text-main">
            <Dumbbell className="h-4 w-4" /> practice missed words
          </button>
        )}
      </div>
    </div>
  );
}
