import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookmarkPlus, Dices, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useSettings } from '../store/settings';
import { useStats } from '../store/stats';
import { AiError, generateText, listOllamaModels } from '../ai/providers';
import {
  SURPRISE_TOPICS,
  randomTopic,
  type AiLength,
  type Tone,
  type Vocabulary,
} from '../ai/promptBuilder';
import { Pill } from '../components/Pill';
import { wordCount } from '../lib/types';

const TONES: Tone[] = ['story', 'informative', 'funny', 'dramatic'];
const LENGTHS: AiLength[] = ['short', 'medium', 'long'];
const VOCABS: Vocabulary[] = ['simple', 'rich'];

function pickChips(n: number): string[] {
  return [...SURPRISE_TOPICS].sort(() => Math.random() - 0.5).slice(0, n);
}

export default function GeneratePage() {
  const navigate = useNavigate();
  const settings = useSettings();
  const addUserText = useStats((s) => s.addUserText);

  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('story');
  const [length, setLength] = useState<AiLength>('medium');
  const [vocabulary, setVocabulary] = useState<Vocabulary>('simple');
  const [chips, setChips] = useState(() => pickChips(6));

  const [models, setModels] = useState<string[] | null>(null);
  const [ollamaDown, setOllamaDown] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiError | null>(null);
  const [result, setResult] = useState<{ title: string; text: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Detect a local Ollama server and its models.
  const { provider, ollamaUrl, ollamaModel, set } = settings;
  useEffect(() => {
    if (provider !== 'ollama') return;
    const ctrl = new AbortController();
    listOllamaModels(ollamaUrl, ctrl.signal)
      .then((list) => {
        setModels(list);
        setOllamaDown(false);
        if (list.length && !list.includes(ollamaModel)) set({ ollamaModel: list[0] });
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setModels(null);
        setOllamaDown(true);
      });
    return () => ctrl.abort();
  }, [provider, ollamaUrl, ollamaModel, set]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(
    async (nextTopic = topic) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setError(null);
      setSaved(false);
      try {
        const text = await generateText(
          useSettings.getState(),
          { topic: nextTopic, tone, length, vocabulary },
          ctrl.signal
        );
        setResult({ title: nextTopic.trim() || 'AI surprise', text });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof AiError ? e : new AiError('http', 'Something went wrong. Try again.'));
        setResult(null);
      } finally {
        if (abortRef.current === ctrl) setBusy(false);
      }
    },
    [topic, tone, length, vocabulary]
  );

  const surprise = () => {
    const t = randomTopic(topic);
    setTopic(t);
    void generate(t);
  };

  const typeIt = () => {
    if (!result) return;
    settings.set({
      mode: 'text',
      textRef: { kind: 'adhoc', title: result.title, text: result.text, origin: 'ai' },
    });
    navigate('/');
  };

  const save = () => {
    if (!result || saved) return;
    addUserText({ title: result.title, text: result.text, origin: 'ai' });
    setSaved(true);
  };

  const providerReady =
    provider === 'ollama'
      ? !ollamaDown && !!ollamaModel
      : provider === 'anthropic'
        ? !!settings.anthropicKey
        : !!settings.openaiUrl;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="h-6 w-6 text-main" /> AI text
        </h1>
        <p className="mt-1 text-sub">
          Describe anything and get a fresh passage to type. No idea? Tap a suggestion or hit
          surprise me.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-panel px-4 py-3 text-sm">
        <span className="text-sub">provider</span>
        <select
          aria-label="Provider"
          value={provider}
          onChange={(e) => set({ provider: e.target.value as typeof provider })}
          className="rounded-md bg-bg px-2 py-1"
        >
          <option value="ollama">Ollama (local)</option>
          <option value="anthropic">Anthropic (API key)</option>
          <option value="openai">OpenAI-compatible</option>
        </select>
        {provider === 'ollama' && models && models.length > 0 && (
          <select
            aria-label="Ollama model"
            value={ollamaModel}
            onChange={(e) => set({ ollamaModel: e.target.value })}
            className="rounded-md bg-bg px-2 py-1"
          >
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        <span className={providerReady ? 'text-main' : 'text-sub'}>
          {providerReady
            ? 'ready'
            : provider === 'ollama'
              ? ollamaDown
                ? 'Ollama not detected'
                : 'checking...'
              : 'needs setup'}
        </span>
        <Link to="/settings" className="ml-auto text-sub underline hover:text-text">
          configure
        </Link>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={120}
            placeholder="A topic, a character, a question... (or leave blank)"
            aria-label="Topic"
            className="min-w-0 flex-1 rounded-lg bg-panel px-4 py-3"
          />
          <button
            type="button"
            onClick={surprise}
            disabled={busy}
            title="Random topic"
            className="flex items-center gap-2 rounded-lg bg-panel px-4 hover:text-main disabled:opacity-50"
          >
            <Dices className="h-5 w-5" />
            <span className="hidden sm:inline">surprise me</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setTopic(c)}
              className="rounded-full bg-panel px-3 py-1 text-sm text-sub hover:text-main"
            >
              {c}
            </button>
          ))}
          <button type="button" aria-label="More suggestions" onClick={() => setChips(pickChips(6))} className="text-sub hover:text-text">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 rounded-xl bg-panel p-4 text-sm sm:grid-cols-3">
          <fieldset>
            <legend className="mb-1 text-sub">style</legend>
            {TONES.map((t) => (
              <Pill key={t} active={tone === t} onClick={() => setTone(t)}>{t}</Pill>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sub">length</legend>
            {LENGTHS.map((l) => (
              <Pill key={l} active={length === l} onClick={() => setLength(l)}>{l}</Pill>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sub">vocabulary</legend>
            {VOCABS.map((v) => (
              <Pill key={v} active={vocabulary === v} onClick={() => setVocabulary(v)}>{v}</Pill>
            ))}
          </fieldset>
        </div>

        <button
          type="submit"
          disabled={busy || !providerReady}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-main px-4 py-3 font-semibold text-bg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {busy ? 'Generating...' : 'Generate text'}
        </button>
      </form>

      {error && (
        <div role="alert" className="space-y-2 rounded-xl border border-error/50 bg-error/10 p-4 text-sm">
          <p className="text-error">{error.message}</p>
          {error.kind === 'unreachable' && provider === 'ollama' && (
            <p className="text-sub">
              Make sure Ollama is running (<code>ollama serve</code>). If this site is hosted
              somewhere other than localhost, start Ollama with{' '}
              <code>OLLAMA_ORIGINS={window.location.origin}</code> so your browser is allowed to talk
              to it.
            </p>
          )}
          <button
            onClick={() => {
              settings.set({ mode: 'text', textRef: { kind: 'random' } });
              navigate('/');
            }}
            className="text-main underline"
          >
            Type a library text instead
          </button>
        </div>
      )}

      {result && (
        <section className="fade-up space-y-4 rounded-xl bg-panel p-5" aria-label="Generated text">
          <p className="font-typing leading-relaxed">{result.text}</p>
          <p className="text-xs text-sub">{wordCount(result.text)} words</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={typeIt} className="flex items-center gap-2 rounded-lg bg-main px-4 py-2 text-bg hover:opacity-90">
              <Play className="h-4 w-4" /> type it
            </button>
            <button onClick={save} disabled={saved} className="flex items-center gap-2 rounded-lg bg-bg px-4 py-2 hover:text-main disabled:opacity-60">
              <BookmarkPlus className="h-4 w-4" /> {saved ? 'saved to My texts' : 'save to My texts'}
            </button>
            <button onClick={() => void generate()} disabled={busy} className="flex items-center gap-2 rounded-lg bg-bg px-4 py-2 hover:text-main disabled:opacity-60">
              <RefreshCw className="h-4 w-4" /> another
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
