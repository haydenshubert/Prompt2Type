import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../store/settings';
import { THEMES } from '../themes/themes';

interface Command {
  id: string;
  label: string;
  run: () => void;
}

/** Ctrl/Cmd+K (or Esc) palette for switching modes, themes, and pages from the keyboard. */
export function CommandPalette() {
  const navigate = useNavigate();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => navigate(path);
    const mode = (m: typeof settings.mode) => () => {
      settings.set({ mode: m });
      navigate('/');
    };
    return [
      { id: 'p-type', label: 'Go to: type', run: go('/') },
      { id: 'p-library', label: 'Go to: library', run: go('/library') },
      { id: 'p-ai', label: 'Go to: AI text', run: go('/generate') },
      { id: 'p-profile', label: 'Go to: profile', run: go('/profile') },
      { id: 'p-settings', label: 'Go to: settings', run: go('/settings') },
      { id: 'm-time', label: 'Mode: time', run: mode('time') },
      { id: 'm-words', label: 'Mode: words', run: mode('words') },
      { id: 'm-text', label: 'Mode: text', run: mode('text') },
      { id: 'm-zen', label: 'Mode: zen', run: mode('zen') },
      {
        id: 't-daily',
        label: "Play today's daily text",
        run: () => {
          settings.set({ mode: 'text', textRef: { kind: 'daily' } });
          navigate('/');
        },
      },
      { id: 'o-punct', label: `Toggle punctuation (${settings.punctuation ? 'on' : 'off'})`, run: () => settings.set({ punctuation: !settings.punctuation }) },
      { id: 'o-num', label: `Toggle numbers (${settings.numbers ? 'on' : 'off'})`, run: () => settings.set({ numbers: !settings.numbers }) },
      { id: 'o-blind', label: `Toggle blind mode (${settings.blindMode ? 'on' : 'off'})`, run: () => settings.set({ blindMode: !settings.blindMode }) },
      { id: 'o-sound', label: `Toggle key sounds (${settings.sound ? 'on' : 'off'})`, run: () => settings.set({ sound: !settings.sound }) },
      ...THEMES.map((t) => ({
        id: `theme-${t.id}`,
        label: `Theme: ${t.name}`,
        run: () => settings.set({ theme: t.id }),
      })),
    ];
  }, [navigate, settings]);

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return commands.filter((c) => words.every((w) => c.label.toLowerCase().includes(w)));
  }, [commands, query]);

  useEffect(() => {
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const runAt = (i: number) => {
    const c = filtered[i];
    if (!c) return;
    setOpen(false);
    c.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-panel shadow-2xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              runAt(index);
            }
          }}
          placeholder="Type a command..."
          aria-label="Command"
          className="w-full bg-bg px-4 py-3 outline-none"
        />
        <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && <li className="px-4 py-3 text-sub">No matching commands</li>}
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                onClick={() => runAt(i)}
                onMouseEnter={() => setIndex(i)}
                className={'w-full px-4 py-2 text-left ' + (i === index ? 'bg-bg text-main' : '')}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
