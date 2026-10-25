import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { TypingArea } from '../components/TypingArea';
import { ConfigBar } from '../components/ConfigBar';
import { LiveStats } from '../components/LiveStats';
import { ResultsPanel } from '../components/ResultsPanel';
import type { EngineOptions } from '../engine/engine';
import { computeMetrics, type Metrics } from '../engine/metrics';
import { generateWords, practiceWords, resolveText, textToWords } from '../engine/textSources';
import { useTypingEngine } from '../engine/useTypingEngine';
import { useSettings, type Settings } from '../store/settings';
import { dayKey, useStats, type Achievement, type ResultRecord } from '../store/stats';
import type { Category, UserText } from '../lib/types';

interface Test {
  words: string[];
  options: EngineOptions;
  title: string;
  label: string;
  configKey: string;
  mode: string;
  category?: Category;
  textId?: string;
  isDaily?: boolean;
}

const MORE_WORDS = 50;

function buildTest(s: Settings, userTexts: UserText[]): Test {
  const base = {
    stopOnError: s.stopOnError,
    backspacePrev: s.backspacePrev,
  };
  const wordOpts = {
    list: s.wordList,
    punctuation: s.punctuation,
    numbers: s.numbers,
    lowercase: s.lowercase,
  };
  const flags = `${s.wordList}${s.punctuation ? '+p' : ''}${s.numbers ? '+n' : ''}`;

  if (s.mode === 'time') {
    return {
      words: generateWords(MORE_WORDS * 2, wordOpts),
      options: { ...base, timeLimit: s.timeLimit, zen: false },
      title: '',
      label: `${s.timeLimit}s ${flags}`,
      configKey: `time-${s.timeLimit}-${flags}`,
      mode: 'time',
    };
  }
  if (s.mode === 'words') {
    return {
      words: generateWords(s.wordCount, wordOpts),
      options: { ...base, timeLimit: 0, zen: false },
      title: '',
      label: `${s.wordCount} words ${flags}`,
      configKey: `words-${s.wordCount}-${flags}`,
      mode: 'words',
    };
  }
  if (s.mode === 'zen') {
    return {
      words: [],
      options: { ...base, timeLimit: 0, zen: true },
      title: 'Zen mode: type anything. Press Ctrl+Enter or finish when done.',
      label: 'zen',
      configKey: 'zen',
      mode: 'zen',
    };
  }
  const t = resolveText(s.textRef, userTexts, dayKey());
  const ai = s.textRef.kind === 'adhoc' && s.textRef.origin === 'ai';
  return {
    words: textToWords(t.text),
    options: { ...base, timeLimit: 0, zen: false },
    title: t.title,
    label: t.title,
    configKey: `text-${t.id ?? 'adhoc'}`,
    mode: ai ? 'ai' : 'text',
    category: t.category,
    textId: t.id,
    isDaily: t.isDaily,
  };
}

interface Outcome {
  metrics: Metrics;
  newBest: boolean;
  failed: boolean;
  best: number;
  unlocked: Achievement[];
}

export default function TypePage() {
  const settings = useSettings();
  const addResult = useStats((s) => s.addResult);

  const [test, setTest] = useState<Test>(() =>
    buildTest(useSettings.getState(), useStats.getState().userTexts)
  );
  const [testKey, setTestKey] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const engine = useTypingEngine(test.words, test.options);
  const { state } = engine;
  const recordedKey = useRef(-1);

  const start = useCallback(
    (next: Test) => {
      setTest(next);
      setOutcome(null);
      setTestKey((k) => k + 1);
      engine.reset(next.words, next.options);
    },
    [engine]
  );

  const newTest = useCallback(
    () => start(buildTest(useSettings.getState(), useStats.getState().userTexts)),
    [start]
  );

  const restart = useCallback(() => {
    setOutcome(null);
    setTestKey((k) => k + 1);
    engine.reset(test.words, test.options);
  }, [engine, test]);

  // Rebuild the test whenever a setting that shapes it changes.
  const signature = useMemo(
    () =>
      JSON.stringify([
        settings.mode,
        settings.timeLimit,
        settings.wordCount,
        settings.wordList,
        settings.punctuation,
        settings.numbers,
        settings.lowercase,
        settings.textRef,
        settings.stopOnError,
        settings.backspacePrev,
      ]),
    [
      settings.mode,
      settings.timeLimit,
      settings.wordCount,
      settings.wordList,
      settings.punctuation,
      settings.numbers,
      settings.lowercase,
      settings.textRef,
      settings.stopOnError,
      settings.backspacePrev,
    ]
  );
  const lastSignature = useRef(signature);
  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    newTest();
  }, [signature, newTest]);

  // Keep timed tests supplied with words.
  useEffect(() => {
    if (
      state.options.timeLimit > 0 &&
      state.status === 'running' &&
      state.words.length - state.wordIndex < 30
    ) {
      engine.extend(
        generateWords(MORE_WORDS, {
          list: settings.wordList,
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          lowercase: settings.lowercase,
        })
      );
    }
  }, [state.wordIndex, state.status, state.words.length, state.options.timeLimit, engine, settings.wordList, settings.punctuation, settings.numbers, settings.lowercase]);

  // Record the result exactly once when a test ends.
  useEffect(() => {
    if (state.status !== 'finished' || recordedKey.current === testKey) return;
    recordedKey.current = testKey;
    if (state.correctKeys + state.incorrectKeys === 0) return;
    const metrics = computeMetrics(state, state.endTime ?? performance.now());
    const failed =
      settings.minAccuracy > 0 && metrics.accuracy < settings.minAccuracy;
    const record: ResultRecord = {
      id: `${Date.now().toString(36)}${testKey}`,
      at: Date.now(),
      configKey: test.configKey,
      configLabel: test.label,
      mode: test.mode,
      wpm: metrics.wpm,
      raw: metrics.raw,
      accuracy: metrics.accuracy,
      consistency: metrics.consistency,
      seconds: metrics.seconds,
      category: test.category,
      textId: test.textId,
      isDaily: test.isDaily,
      failed,
      missedWords: metrics.missedWords,
      missedKeys: state.missedKeys,
    };
    const prevBest = useStats.getState().bests[test.configKey] ?? 0;
    const { newBest, unlocked } = addResult(record);
    setOutcome({
      metrics,
      failed,
      newBest: newBest && test.mode !== 'zen' && prevBest > 0,
      best: Math.max(prevBest, failed ? 0 : metrics.wpm),
      unlocked,
    });
  }, [state, testKey, test, settings.minAccuracy, addResult]);

  // Global shortcuts: Tab restarts, Enter (on results) starts the next test.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        restart();
      } else if (e.key === 'Enter' && state.status === 'finished') {
        e.preventDefault();
        newTest();
      } else if (e.key === 'Enter' && e.ctrlKey && state.options.zen) {
        e.preventDefault();
        engine.finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [restart, newTest, engine, state.status, state.options.zen]);

  const practice = () => {
    if (!outcome) return;
    const words = practiceWords(outcome.metrics.missedWords);
    if (!words.length) return;
    start({
      words,
      options: { ...test.options, timeLimit: 0, zen: false },
      title: 'Practice: your missed words',
      label: 'practice',
      configKey: 'practice',
      mode: 'practice',
    });
  };

  const finished = state.status === 'finished';
  const running = state.status === 'running';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
      <div
        className={
          'transition-opacity duration-300 ' +
          (running ? 'pointer-events-none opacity-0' : 'opacity-100')
        }
      >
        <ConfigBar onNewText={newTest} />
      </div>

      {finished && outcome ? (
        <ResultsPanel
          metrics={outcome.metrics}
          label={test.label}
          best={outcome.best}
          newBest={outcome.newBest}
          failed={outcome.failed}
          minAccuracy={settings.minAccuracy}
          unlocked={outcome.unlocked}
          onRetry={restart}
          onNext={newTest}
          onPractice={test.mode === 'practice' ? undefined : practice}
        />
      ) : finished ? (
        <div className="text-center text-sub">
          Nothing typed.{' '}
          <button className="text-main underline" onClick={newTest}>
            Start a new test
          </button>
        </div>
      ) : (
        <div className="my-auto flex flex-col gap-3">
          {test.title && (
            <p className="text-center text-sm text-sub">{test.title}</p>
          )}
          <LiveStats
            state={state}
            now={engine.now}
            showWpm={settings.liveStats}
            totalWords={test.words.length}
          />
          <TypingArea engine={engine} autoFocusKey={testKey} />
          <div className="flex items-center justify-center gap-4 pt-4 text-sm text-sub">
            <button onClick={restart} className="flex items-center gap-1 hover:text-text" title="Restart (Tab)">
              <RotateCcw className="h-4 w-4" /> restart
            </button>
            {state.options.zen && running && (
              <button onClick={engine.finish} className="flex items-center gap-1 text-main hover:opacity-80">
                <Check className="h-4 w-4" /> finish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
