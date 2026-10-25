import { useRef, useState, type ReactNode } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useSettings, type CaretStyle } from '../store/settings';
import { useStats } from '../store/stats';
import { FONTS, THEMES } from '../themes/themes';
import { Pill } from '../components/Pill';
import type { BackspacePrev, StopOnError } from '../engine/engine';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-main">{title}</h2>
      <div className="space-y-4 rounded-xl bg-panel p-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-4">
      <div>
        <div>{label}</div>
        {hint && <div className="text-xs text-sub">{hint}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <>
      <Pill active={value} onClick={() => onChange(true)}>on</Pill>
      <Pill active={!value} onClick={() => onChange(false)}>off</Pill>
    </>
  );
}

const inputCls = 'w-full max-w-md rounded-lg bg-bg px-3 py-2';

export default function SettingsPage() {
  const s = useSettings();
  const stats = useStats();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const exportAll = () => {
    const { set: _s, reset: _r, ...settings } = useSettings.getState();
    const payload = JSON.stringify(
      {
        app: 'prompt2type',
        exportedAt: new Date().toISOString(),
        // API keys stay on this device and are never exported.
        settings: { ...settings, anthropicKey: '', openaiKey: '' },
        stats: JSON.parse(stats.exportData()),
      },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt2type-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Exported. API keys are not included.');
  };

  const importAll = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'prompt2type') throw new Error('Not a Prompt2Type export');
      stats.importData(JSON.stringify(data.stats));
      const { anthropicKey, openaiKey } = useSettings.getState();
      s.set({ ...data.settings, anthropicKey, openaiKey });
      setMessage('Imported successfully.');
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : 'invalid file'}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Section title="Appearance">
        <div>
          <div className="mb-2">theme</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => s.set({ theme: t.id })}
                aria-pressed={s.theme === t.id}
                style={{ background: t.bg, color: t.text, borderColor: s.theme === t.id ? t.main : 'transparent' }}
                className="flex items-center justify-between rounded-lg border-2 px-3 py-2 text-sm"
              >
                <span>{t.name}</span>
                <span className="flex gap-1" aria-hidden>
                  <i className="h-3 w-3 rounded-full" style={{ background: t.main }} />
                  <i className="h-3 w-3 rounded-full" style={{ background: t.sub }} />
                  <i className="h-3 w-3 rounded-full" style={{ background: t.error }} />
                </span>
              </button>
            ))}
          </div>
        </div>
        <Row label="font">
          <select
            aria-label="Font"
            value={s.font}
            onChange={(e) => s.set({ font: e.target.value })}
            className="rounded-lg bg-bg px-3 py-2"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </Row>
        <Row label="font size" hint={`${s.fontSize.toFixed(2)}rem`}>
          <input
            type="range"
            aria-label="Font size"
            min={1}
            max={3}
            step={0.125}
            value={s.fontSize}
            onChange={(e) => s.set({ fontSize: Number(e.target.value) })}
            className="w-full max-w-xs"
          />
        </Row>
        <Row label="caret style">
          {(['line', 'block', 'underline'] as CaretStyle[]).map((c) => (
            <Pill key={c} active={s.caret === c} onClick={() => s.set({ caret: c })}>{c}</Pill>
          ))}
        </Row>
        <Row label="live wpm" hint="Show speed while typing">
          <Toggle value={s.liveStats} onChange={(v) => s.set({ liveStats: v })} />
        </Row>
        <Row label="key sounds">
          <Toggle value={s.sound} onChange={(v) => s.set({ sound: v })} />
        </Row>
        <div
          className="typing-text rounded-lg bg-bg p-4"
          aria-label="Preview"
        >
          <span className="text-text">the quick brown </span>
          <span className="text-error">fax</span>
          <span className="text-sub"> jumps over the lazy dog</span>
        </div>
      </Section>

      <Section title="Typing behavior">
        <Row label="stop on error" hint="Block progress until fixed">
          {(['off', 'letter', 'word'] as StopOnError[]).map((v) => (
            <Pill key={v} active={s.stopOnError === v} onClick={() => s.set({ stopOnError: v })}>{v}</Pill>
          ))}
        </Row>
        <Row label="backspace into previous word">
          {(['never', 'incorrect', 'always'] as BackspacePrev[]).map((v) => (
            <Pill key={v} active={s.backspacePrev === v} onClick={() => s.set({ backspacePrev: v })}>
              {v === 'incorrect' ? 'only if wrong' : v}
            </Pill>
          ))}
        </Row>
        <Row label="blind mode" hint="Hide error highlighting">
          <Toggle value={s.blindMode} onChange={(v) => s.set({ blindMode: v })} />
        </Row>
        <Row label="lowercase only" hint="For word and time tests">
          <Toggle value={s.lowercase} onChange={(v) => s.set({ lowercase: v })} />
        </Row>
        <Row
          label="minimum accuracy"
          hint={s.minAccuracy ? `Tests under ${s.minAccuracy}% count as failed` : 'Off'}
        >
          <input
            type="range"
            aria-label="Minimum accuracy"
            min={0}
            max={100}
            step={5}
            value={s.minAccuracy}
            onChange={(e) => s.set({ minAccuracy: Number(e.target.value) })}
            className="w-full max-w-xs"
          />
        </Row>
      </Section>

      <Section title="AI text generation">
        <p className="text-sm text-sub">
          Keys are stored only in this browser (localStorage) and sent directly to the provider you
          choose. Do not use a key you cannot afford to leak on a shared computer.
        </p>
        <Row label="provider">
          {([['ollama', 'Ollama'], ['anthropic', 'Anthropic'], ['openai', 'OpenAI-compatible']] as const).map(([id, name]) => (
            <Pill key={id} active={s.provider === id} onClick={() => s.set({ provider: id })}>{name}</Pill>
          ))}
        </Row>
        {s.provider === 'ollama' && (
          <Row label="Ollama URL" hint="Pick the model on the AI page">
            <input aria-label="Ollama URL" className={inputCls} value={s.ollamaUrl} onChange={(e) => s.set({ ollamaUrl: e.target.value })} />
          </Row>
        )}
        {s.provider === 'anthropic' && (
          <>
            <Row label="API key">
              <input aria-label="Anthropic API key" type="password" autoComplete="off" className={inputCls} value={s.anthropicKey} onChange={(e) => s.set({ anthropicKey: e.target.value.trim() })} placeholder="sk-ant-..." />
            </Row>
            <Row label="model">
              <input aria-label="Anthropic model" className={inputCls} value={s.anthropicModel} onChange={(e) => s.set({ anthropicModel: e.target.value.trim() })} />
            </Row>
          </>
        )}
        {s.provider === 'openai' && (
          <>
            <Row label="base URL" hint="OpenAI, Groq, LM Studio, ...">
              <input aria-label="Base URL" className={inputCls} value={s.openaiUrl} onChange={(e) => s.set({ openaiUrl: e.target.value.trim() })} />
            </Row>
            <Row label="API key" hint="Optional for local servers">
              <input aria-label="OpenAI API key" type="password" autoComplete="off" className={inputCls} value={s.openaiKey} onChange={(e) => s.set({ openaiKey: e.target.value.trim() })} />
            </Row>
            <Row label="model">
              <input aria-label="OpenAI model" className={inputCls} value={s.openaiModel} onChange={(e) => s.set({ openaiModel: e.target.value.trim() })} />
            </Row>
          </>
        )}
      </Section>

      <Section title="Your data">
        <p className="text-sm text-sub">
          Everything is saved in this browser only. Export a backup to move it to another device.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportAll} className="flex items-center gap-2 rounded-lg bg-bg px-4 py-2 hover:text-main">
            <Download className="h-4 w-4" /> export
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-bg px-4 py-2 hover:text-main">
            <Upload className="h-4 w-4" /> import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importAll(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => {
              if (confirm('Delete all history, personal bests, favorites and saved texts? This cannot be undone.')) {
                stats.clearHistory();
                setMessage('History cleared.');
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-bg px-4 py-2 text-error hover:opacity-80"
          >
            <Trash2 className="h-4 w-4" /> clear history
          </button>
          <button
            onClick={() => {
              s.reset();
              setMessage('Settings reset to defaults.');
            }}
            className="rounded-lg bg-bg px-4 py-2 hover:text-main"
          >
            reset settings
          </button>
        </div>
        {message && <p role="status" className="text-sm text-main">{message}</p>}
      </Section>
    </div>
  );
}
