import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { TypingEngine } from '../engine/useTypingEngine';
import type { EngineState } from '../engine/engine';
import { useSettings } from '../store/settings';
import { playClick } from '../lib/sound';

const VISIBLE_LINES = 3;

interface WordProps {
  word: string;
  typed: string;
  committed: boolean;
  blind: boolean;
  zen: boolean;
}

/** One word, rendered per character. Memoized so only changed words re-render. */
const Word = memo(function Word({ word, typed, committed, blind, zen }: WordProps) {
  if (zen) {
    return (
      <span className="word mr-[0.6em] inline-block text-text" data-word>
        {typed.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </span>
    );
  }
  const wrong = committed && typed !== word;
  const len = Math.max(word.length, typed.length);
  const chars = [];
  for (let i = 0; i < len; i++) {
    const expected = word[i];
    const got = typed[i];
    let cls = 'text-sub';
    if (got !== undefined) {
      if (expected === undefined) cls = blind ? 'text-text' : 'text-error-extra';
      else if (got === expected) cls = 'text-text';
      else cls = blind ? 'text-text' : 'text-error';
    } else if (committed && !blind) {
      cls = 'text-sub opacity-60';
    }
    chars.push(
      <span key={i} className={cls}>
        {expected ?? got}
      </span>
    );
  }
  return (
    <span
      data-word
      className={
        'word mr-[0.6em] inline-block border-b-2 ' +
        (wrong && !blind ? 'border-error' : 'border-transparent')
      }
    >
      {chars}
    </span>
  );
});

interface Props {
  engine: TypingEngine;
  /** Called when the test is blurred/focused so the page can show hints. */
  onFocusChange?: (focused: boolean) => void;
  autoFocusKey: string | number;
}

export function TypingArea({ engine, onFocusChange, autoFocusKey }: Props) {
  const { state } = engine;
  const caretStyle = useSettings((s) => s.caret);
  const blind = useSettings((s) => s.blindMode);
  const sound = useSettings((s) => s.sound);
  const fontSize = useSettings((s) => s.fontSize);
  const font = useSettings((s) => s.font);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Optimistic: autofocus runs right after mount, so don't flash the blur.
  const [focused, setFocused] = useState(true);
  const [caret, setCaret] = useState({ left: 0, top: 0, width: 2, height: 0 });
  const [offset, setOffset] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  // Re-focus whenever a fresh test starts.
  useEffect(() => {
    focusInput();
  }, [autoFocusKey, focusInput]);

  // "Press any key to focus": a keystroke while blurred refocuses the input.
  useEffect(() => {
    if (focused) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab' || e.key === 'Escape') return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      focusInput();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused, focusInput]);

  const typedNow = state.typed[state.wordIndex] ?? '';

  // Position the caret and scroll lines, measured from the DOM.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wordEl = wrap.querySelectorAll<HTMLElement>('[data-word]')[state.wordIndex];
    if (!wordEl) return;
    const charEls = wordEl.children;
    const idx = Math.min(typedNow.length, charEls.length);
    const wrapRect = wrap.getBoundingClientRect();
    let left: number;
    let top: number;
    let width: number;
    let height: number;
    const ref = (idx < charEls.length ? charEls[idx] : charEls[charEls.length - 1]) as
      | HTMLElement
      | undefined;
    if (ref) {
      const r = ref.getBoundingClientRect();
      left = idx < charEls.length ? r.left : r.right;
      top = r.top;
      width = r.width;
      height = r.height;
    } else {
      const r = wordEl.getBoundingClientRect();
      left = r.left;
      top = r.top;
      width = fontSize * 16 * 0.6;
      height = fontSize * 16 * 1.6;
    }
    // wrapRect.top already reflects the current scroll translation.
    setCaret({
      left: left - wrapRect.left,
      top: top - wrapRect.top,
      width,
      height,
    });

    // Use the real CSS line-height (the glyph box is shorter than a line).
    const lh = parseFloat(getComputedStyle(wordEl).lineHeight) || fontSize * 16 * 1.6;
    setLineHeight(lh);
    const lineTop = wordEl.offsetTop;
    const target = Math.max(0, lineTop - lh);
    setOffset((prev) => (Math.abs(prev - target) < 1 ? prev : target));
  }, [state.wordIndex, typedNow, state.words.length, fontSize, font]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && !e.altKey && e.key !== 'Backspace') return;
    if (e.metaKey && e.key !== 'Backspace') return;
    if (state.status === 'finished') return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      engine.backspace(e.ctrlKey || e.altKey || e.metaKey);
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      engine.space();
      if (sound) playClick();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      engine.type(e.key);
      if (sound) {
        const expected = state.words[state.wordIndex]?.[typedNow.length];
        playClick(!state.options.zen && expected !== e.key);
      }
    }
  };

  const blockHeight = lineHeight ? lineHeight * VISIBLE_LINES : undefined;
  const caretClass =
    'absolute bg-main transition-[left,top] duration-75 ease-out ' +
    (state.status === 'running' ? '' : 'caret-blink');
  const caretBox =
    caretStyle === 'line'
      ? { left: caret.left - 1, top: caret.top + 4, width: 2, height: caret.height - 8 }
      : caretStyle === 'block'
        ? { left: caret.left, top: caret.top, width: caret.width, height: caret.height, opacity: 0.35 }
        : { left: caret.left, top: caret.top + caret.height - 4, width: caret.width, height: 3 };

  return (
    <div
      className="relative cursor-text select-none"
      onClick={focusInput}
      data-testid="typing-area"
    >
      <input
        ref={inputRef}
        aria-label="Typing input"
        className="absolute h-0 w-0 opacity-0"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onFocus={() => {
          setFocused(true);
          onFocusChange?.(true);
        }}
        onBlur={() => {
          setFocused(false);
          onFocusChange?.(false);
        }}
        value=""
        onChange={() => {}}
      />
      <div
        className={
          'typing-text relative overflow-hidden transition-[filter] duration-150 ' +
          (focused ? '' : 'blur-[6px]')
        }
        style={blockHeight ? { height: blockHeight } : { height: `${fontSize * 1.6 * VISIBLE_LINES}rem` }}
      >
        <div
          ref={wrapRef}
          className="relative flex flex-wrap transition-transform duration-100"
          style={{ transform: `translateY(${-offset}px)` }}
        >
          <div
            className={caretClass}
            style={caretBox}
            aria-hidden
          />
          <Words state={state} blind={blind} />
        </div>
      </div>
      {!focused && state.status !== 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center text-sub">
          Click here or press any key to focus
        </div>
      )}
    </div>
  );
}

function Words({ state, blind }: { state: EngineState; blind: boolean }) {
  const zen = state.options.zen;
  const list = zen ? state.typed : state.words;
  return (
    <>
      {list.map((w, i) => (
        <Word
          key={i}
          word={zen ? '' : w}
          typed={state.typed[i] ?? ''}
          committed={i < state.wordIndex}
          blind={blind}
          zen={zen}
        />
      ))}
    </>
  );
}
