import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Heart, Play, Plus, Search, Shuffle, Trash2 } from 'lucide-react';
import { LIBRARY } from '../data/library';
import { useSettings } from '../store/settings';
import { useStats } from '../store/stats';
import {
  CATEGORY_LABELS,
  lengthBucket,
  wordCount,
  type Category,
  type Difficulty,
  type TextRef,
} from '../lib/types';
import { MAX_CUSTOM_CHARS, normalizeTypeable } from '../lib/text';
import { Pill } from '../components/Pill';

export default function LibraryPage() {
  const navigate = useNavigate();
  const setSettings = useSettings((s) => s.set);
  const { bests, favorites, userTexts, toggleFavorite, addUserText, removeUserText } = useStats();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all' | 'favorites'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const play = (ref: TextRef) => {
    setSettings({ mode: 'text', textRef: ref });
    navigate('/');
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY.filter(
      (t) =>
        (category === 'all' ||
          (category === 'favorites' ? favorites.includes(t.id) : t.category === category)) &&
        (difficulty === 'all' || t.difficulty === difficulty) &&
        (!q || t.title.toLowerCase().includes(q) || t.text.toLowerCase().includes(q))
    );
  }, [query, category, difficulty, favorites]);

  const cleaned = normalizeTypeable(body).slice(0, MAX_CUSTOM_CHARS);
  const canAdd = wordCount(cleaned) >= 5;

  const addCustom = (andPlay: boolean) => {
    if (!canAdd) return;
    const t = addUserText({
      title: title.trim() || 'My text',
      text: cleaned,
      origin: 'custom',
    });
    setTitle('');
    setBody('');
    if (andPlay) play({ kind: 'user', id: t.id });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-6 sm:px-8">
      <section>
        <h1 className="text-2xl font-semibold">Text library</h1>
        <p className="mt-1 text-sub">
          No idea what to type? Pick a story, a fact, or a tongue twister, or let us surprise you.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => play({ kind: 'random' })} className="flex items-center gap-2 rounded-lg bg-main px-4 py-2 text-bg hover:opacity-90">
            <Shuffle className="h-4 w-4" /> Surprise me
          </button>
          <button onClick={() => play({ kind: 'daily' })} className="flex items-center gap-2 rounded-lg bg-panel px-4 py-2 hover:text-main">
            <CalendarDays className="h-4 w-4" /> Today's text
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg bg-panel px-3 py-2">
            <Search className="h-4 w-4 text-sub" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search texts"
              aria-label="Search texts"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')}
            className="rounded-lg px-3 py-2"
          >
            <option value="all">any difficulty</option>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          <Pill active={category === 'all'} onClick={() => setCategory('all')}>all</Pill>
          <Pill active={category === 'favorites'} onClick={() => setCategory('favorites')}>favorites</Pill>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </Pill>
          ))}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => {
            const best = bests[`text-${t.id}`];
            const fav = favorites.includes(t.id);
            return (
              <li key={t.id} className="flex flex-col rounded-xl bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{t.title}</h2>
                  <button
                    onClick={() => toggleFavorite(t.id)}
                    aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                    aria-pressed={fav}
                    className={fav ? 'text-error' : 'text-sub hover:text-text'}
                  >
                    <Heart className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-sub">{t.text}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-sub">
                  <span>
                    {CATEGORY_LABELS[t.category]} · {t.difficulty} · {lengthBucket(t.text)} ({wordCount(t.text)} words)
                    {best ? <span className="text-main"> · best {Math.round(best)} wpm</span> : null}
                  </span>
                  <button onClick={() => play({ kind: 'library', id: t.id })} className="flex items-center gap-1 rounded-md bg-bg px-3 py-1 text-sm text-main hover:opacity-80">
                    <Play className="h-3.5 w-3.5" /> type
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && <p className="text-sub">No texts match those filters.</p>}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My texts</h2>
        <div className="space-y-3 rounded-xl bg-panel p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Custom text title"
            maxLength={60}
            className="w-full rounded-lg bg-bg px-3 py-2"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste or write anything you want to type..."
            aria-label="Custom text"
            rows={4}
            className="w-full rounded-lg bg-bg px-3 py-2"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-sub">
            <span>
              {wordCount(cleaned)} words
              {body.length > MAX_CUSTOM_CHARS ? ` (trimmed to ${MAX_CUSTOM_CHARS} characters)` : ''}
              {' · '}special characters are simplified so you can type them
            </span>
            <span className="flex gap-2">
              <button disabled={!canAdd} onClick={() => addCustom(false)} className="flex items-center gap-1 rounded-lg bg-bg px-3 py-1.5 enabled:hover:text-main disabled:opacity-40">
                <Plus className="h-4 w-4" /> save
              </button>
              <button disabled={!canAdd} onClick={() => addCustom(true)} className="flex items-center gap-1 rounded-lg bg-main px-3 py-1.5 text-bg enabled:hover:opacity-90 disabled:opacity-40">
                <Play className="h-4 w-4" /> save &amp; type
              </button>
            </span>
          </div>
        </div>

        {userTexts.length > 0 && (
          <ul className="space-y-2">
            {userTexts.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-panel px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {t.title}
                    {t.origin === 'ai' && <span className="ml-2 text-xs text-main">AI</span>}
                  </div>
                  <div className="truncate text-sm text-sub">
                    {wordCount(t.text)} words
                    {bests[`text-${t.id}`] ? ` · best ${Math.round(bests[`text-${t.id}`])} wpm` : ''}
                  </div>
                </div>
                <span className="flex shrink-0 gap-2">
                  <button onClick={() => play({ kind: 'user', id: t.id })} className="rounded-md bg-bg px-3 py-1 text-sm text-main hover:opacity-80">type</button>
                  <button onClick={() => removeUserText(t.id)} aria-label={`Delete ${t.title}`} className="text-sub hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
