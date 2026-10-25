import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flame, Lock, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, bestStreak, currentStreak, dayKey, useStats } from '../store/stats';
import { Pill } from '../components/Pill';

const HEATMAP_WEEKS = 26;

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-panel p-4">
      <div className="text-sm text-sub">{label}</div>
      <div className="font-typing text-3xl text-main">{value}</div>
      {sub && <div className="text-xs text-sub">{sub}</div>}
    </div>
  );
}

function Heatmap({ counts }: { counts: Map<string, number> }) {
  // Columns are weeks (Sunday first); the last column ends on today.
  const cells = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const out: { key: string; n: number; future: boolean }[] = [];
    for (let i = HEATMAP_WEEKS * 7 - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = dayKey(d);
      out.push({ key, n: counts.get(key) ?? 0, future: d > today });
    }
    return out;
  }, [counts]);

  const level = (n: number) => (n === 0 ? 0.08 : n < 3 ? 0.35 : n < 6 ? 0.65 : 1);
  return (
    <div className="overflow-x-auto">
      <div
        className="grid w-max grid-flow-col grid-rows-7 gap-1"
        role="img"
        aria-label="Typing activity over the last 26 weeks"
      >
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key}: ${c.n} test${c.n === 1 ? '' : 's'}`}
            className="h-3.5 w-3.5 rounded-sm bg-main"
            style={{ opacity: c.future ? 0 : level(c.n) }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { history, bests, unlocked } = useStats();
  const [modeFilter, setModeFilter] = useState('all');

  const valid = useMemo(() => history.filter((r) => !r.failed), [history]);
  const modes = useMemo(() => ['all', ...new Set(history.map((r) => r.mode))], [history]);
  const filtered = useMemo(
    () => (modeFilter === 'all' ? history : history.filter((r) => r.mode === modeFilter)),
    [history, modeFilter]
  );

  const stats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of history) counts.set(dayKey(r.at), (counts.get(dayKey(r.at)) ?? 0) + 1);
    const recent = valid.slice(-10);
    const avg = recent.length ? recent.reduce((a, r) => a + r.wpm, 0) / recent.length : 0;
    const seconds = history.reduce((a, r) => a + r.seconds, 0);

    const keys: Record<string, number> = {};
    const words: Record<string, number> = {};
    for (const r of history) {
      for (const [k, n] of Object.entries(r.missedKeys)) keys[k] = (keys[k] ?? 0) + n;
      for (const w of r.missedWords) words[w] = (words[w] ?? 0) + 1;
    }
    const top = (o: Record<string, number>, n: number) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

    return {
      counts,
      best: Math.max(0, ...valid.map((r) => r.wpm)),
      avg,
      seconds,
      streak: currentStreak(history),
      bestStreak: bestStreak(history),
      topKeys: top(keys, 8),
      topWords: top(words, 10),
    };
  }, [history, valid]);

  const trend = useMemo(
    () =>
      filtered.slice(-50).map((r, i) => ({
        i: i + 1,
        wpm: Math.round(r.wpm),
        accuracy: Math.round(r.accuracy),
      })),
    [filtered]
  );

  if (history.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-8">
        <h1 className="text-2xl font-semibold">Your profile</h1>
        <p className="mt-2 text-sub">
          Finish a test and your history, personal bests, and streaks will show up here.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-lg bg-main px-5 py-2 text-bg hover:opacity-90">
          Start typing
        </Link>
      </div>
    );
  }

  const hours = stats.seconds / 3600;
  const timeLabel = hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(stats.seconds / 60)}m`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-8">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="best wpm" value={Math.round(stats.best)} />
        <Card label="avg (last 10)" value={Math.round(stats.avg)} />
        <Card label="tests" value={history.length} />
        <Card label="time typing" value={timeLabel} />
        <div className="rounded-xl bg-panel p-4">
          <div className="text-sm text-sub">day streak</div>
          <div className="flex items-center gap-2 font-typing text-3xl text-main">
            <Flame className="h-6 w-6" /> {stats.streak}
          </div>
          <div className="text-xs text-sub">best {stats.bestStreak}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        <Heatmap counts={stats.counts} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Progress</h2>
          <div className="flex flex-wrap">
            {modes.map((m) => (
              <Pill key={m} active={modeFilter === m} onClick={() => setModeFilter(m)}>{m}</Pill>
            ))}
          </div>
        </div>
        <div className="h-56 rounded-xl bg-panel p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--sub)" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="i" stroke="var(--sub)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--sub)" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg)', border: 'none', borderRadius: 8, color: 'var(--text)' }} />
              <Line type="monotone" dataKey="accuracy" stroke="var(--sub)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="wpm" stroke="var(--main)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Most missed keys</h2>
          <div className="flex flex-wrap gap-2 rounded-xl bg-panel p-4">
            {stats.topKeys.length === 0 && <span className="text-sub">Nothing yet. Nice!</span>}
            {stats.topKeys.map(([k, n]) => (
              <span key={k} className="rounded-md bg-bg px-3 py-1.5 font-typing">
                <span className="text-error">{k === ' ' ? 'space' : k}</span>
                <span className="ml-2 text-xs text-sub">{n}</span>
              </span>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Most missed words</h2>
          <div className="flex flex-wrap gap-2 rounded-xl bg-panel p-4">
            {stats.topWords.length === 0 && <span className="text-sub">Nothing yet. Nice!</span>}
            {stats.topWords.map(([w, n]) => (
              <span key={w} className="rounded-md bg-bg px-3 py-1.5 font-typing">
                {w}
                <span className="ml-2 text-xs text-sub">{n}</span>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Achievements{' '}
          <span className="text-sm font-normal text-sub">
            {Object.keys(unlocked).length}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const done = !!unlocked[a.id];
            return (
              <li key={a.id} className={'flex items-start gap-3 rounded-xl bg-panel p-3 ' + (done ? '' : 'opacity-50')}>
                {done ? <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-main" /> : <Lock className="mt-0.5 h-5 w-5 shrink-0 text-sub" />}
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-sub">{a.description}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Personal bests</h2>
        <ul className="divide-y divide-sub/20 rounded-xl bg-panel">
          {Object.entries(bests)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([key, wpm]) => {
              const label = [...history].reverse().find((r) => r.configKey === key)?.configLabel ?? key;
              return (
                <li key={key} className="flex justify-between px-4 py-2">
                  <span className="truncate">{label}</span>
                  <span className="font-typing text-main">{Math.round(wpm)} wpm</span>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent tests</h2>
        <div className="overflow-x-auto rounded-xl bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="text-sub">
              <tr>
                <th className="px-4 py-2 font-normal">when</th>
                <th className="px-4 py-2 font-normal">test</th>
                <th className="px-4 py-2 font-normal">wpm</th>
                <th className="px-4 py-2 font-normal">acc</th>
                <th className="px-4 py-2 font-normal">consistency</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().slice(0, 15).map((r) => (
                <tr key={r.id} className={r.failed ? 'text-error' : ''}>
                  <td className="whitespace-nowrap px-4 py-2 text-sub">{new Date(r.at).toLocaleString()}</td>
                  <td className="max-w-48 truncate px-4 py-2">{r.configLabel}</td>
                  <td className="px-4 py-2 font-typing">{Math.round(r.wpm)}</td>
                  <td className="px-4 py-2 font-typing">{Math.round(r.accuracy)}%</td>
                  <td className="px-4 py-2 font-typing">{Math.round(r.consistency)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
