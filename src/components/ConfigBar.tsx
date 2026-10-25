import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, CalendarDays, Hash, Library, Shuffle, Sparkles } from 'lucide-react';
import { useSettings } from '../store/settings';
import type { Mode, WordList } from '../lib/types';
import { Divider, Pill } from './Pill';

const TIMES = [15, 30, 60, 120];
const WORD_COUNTS = [10, 25, 50, 100];
const LISTS: { id: WordList; label: string }[] = [
  { id: 'english-200', label: 'easy' },
  { id: 'english-1k', label: 'wide' },
  { id: 'code', label: 'code' },
];
const MODES: { id: Mode; label: string }[] = [
  { id: 'time', label: 'time' },
  { id: 'words', label: 'words' },
  { id: 'text', label: 'text' },
  { id: 'zen', label: 'zen' },
];

function CustomNumber({
  current,
  presets,
  min,
  max,
  onChange,
  unit,
}: {
  current: number;
  presets: number[];
  min: number;
  max: number;
  onChange: (n: number) => void;
  unit: string;
}) {
  const [editing, setEditing] = useState(false);
  const custom = !presets.includes(current);
  return (
    <>
      {presets.map((n) => (
        <Pill key={n} active={n === current} onClick={() => onChange(n)}>
          {n}
        </Pill>
      ))}
      {editing ? (
        <input
          autoFocus
          type="number"
          min={min}
          max={max}
          defaultValue={custom ? current : ''}
          placeholder={unit}
          aria-label={`Custom ${unit}`}
          className="w-16 rounded bg-panel px-2 py-0.5 text-sm"
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Enter') {
              const n = Math.round(Number(e.currentTarget.value));
              if (n >= min && n <= max) onChange(n);
              setEditing(false);
            }
          }}
        />
      ) : (
        <Pill active={custom} onClick={() => setEditing(true)} title={`Custom ${unit}`}>
          {custom ? current : 'custom'}
        </Pill>
      )}
    </>
  );
}

export function ConfigBar({ onNewText }: { onNewText: () => void }) {
  const s = useSettings();
  const isWordMode = s.mode === 'time' || s.mode === 'words';

  return (
    <div
      className="mx-auto flex flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-xl bg-panel px-3 py-2"
      role="toolbar"
      aria-label="Test options"
    >
      {isWordMode && (
        <>
          <Pill active={s.punctuation} onClick={() => s.set({ punctuation: !s.punctuation })}>
            <AtSign className="mr-1 inline h-3.5 w-3.5" />
            punctuation
          </Pill>
          <Pill active={s.numbers} onClick={() => s.set({ numbers: !s.numbers })}>
            <Hash className="mr-1 inline h-3.5 w-3.5" />
            numbers
          </Pill>
          <Divider />
          {LISTS.map((l) => (
            <Pill key={l.id} active={s.wordList === l.id} onClick={() => s.set({ wordList: l.id })}>
              {l.label}
            </Pill>
          ))}
          <Divider />
        </>
      )}

      {MODES.map((m) => (
        <Pill key={m.id} active={s.mode === m.id} onClick={() => s.set({ mode: m.id })}>
          {m.label}
        </Pill>
      ))}

      {s.mode === 'time' && (
        <>
          <Divider />
          <CustomNumber current={s.timeLimit} presets={TIMES} min={5} max={600} unit="seconds" onChange={(n) => s.set({ timeLimit: n })} />
        </>
      )}
      {s.mode === 'words' && (
        <>
          <Divider />
          <CustomNumber current={s.wordCount} presets={WORD_COUNTS} min={5} max={500} unit="words" onChange={(n) => s.set({ wordCount: n })} />
        </>
      )}
      {s.mode === 'text' && (
        <>
          <Divider />
          <Pill active={s.textRef.kind === 'random'} onClick={() => { s.set({ textRef: { kind: 'random' } }); onNewText(); }}>
            <Shuffle className="mr-1 inline h-3.5 w-3.5" />
            random
          </Pill>
          <Pill active={s.textRef.kind === 'daily'} onClick={() => s.set({ textRef: { kind: 'daily' } })}>
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            daily
          </Pill>
          <Link to="/library" className="rounded-md px-2.5 py-1 text-sm text-sub hover:text-text">
            <Library className="mr-1 inline h-3.5 w-3.5" />
            library
          </Link>
          <Link to="/generate" className="rounded-md px-2.5 py-1 text-sm text-sub hover:text-text">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            ai
          </Link>
        </>
      )}
    </div>
  );
}
