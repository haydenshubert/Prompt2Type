# Prompt2Type

A customizable, keyboard-first typing speed test with a built-in story library and optional AI-generated text.

Never have an idea what to type? Pick a story, a fact, a fable, or today's daily text. Have an idea? Describe it and let a local (or cloud) model write it for you.

## Features

- **Test modes:** time (15/30/60/120s or custom), words (10/25/50/100 or custom), text (type a full passage), and zen (free typing).
- **Per-character feedback** with a smooth caret, extra/missed letters, and real WPM, raw WPM, accuracy, and consistency, plus a per-second chart.
- **Text options:** punctuation, numbers, lowercase, and word lists (easy, wide, code).
- **Built-in library** of 56 original and public-domain texts (stories, science, history, quotes, tongue twisters, tech, fables, weird & wonderful) with search, filters, favorites, and your best WPM on each.
- **Daily text:** the same passage for everyone each day.
- **My texts:** paste your own text, or save an AI-generated one to replay later.
- **AI text** from local **Ollama** (auto-detected, with a model picker), **Anthropic**, or any **OpenAI-compatible** endpoint, with style/length/vocabulary controls and "surprise me" topic suggestions.
- **Practice missed words** drills built from your mistakes.
- **Profile:** history, personal bests, day streaks, activity heatmap, trend chart, most-missed keys/words, and 15 achievements.
- **Customization:** 14 themes, 7 fonts, font size, caret style, blind mode, stop-on-error, backspace rules, minimum accuracy, optional key sounds.
- **Keyboard shortcuts:** `Tab` restart, `Enter` next test (on results), `Esc` or `Ctrl/Cmd+K` command palette.
- **Private by design:** no backend or accounts. All data lives in your browser; export/import a JSON backup from Settings.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Enabling AI text (optional)

The site works fully without AI. To use a local model:

1. Install [Ollama](https://ollama.com) and pull a model, e.g. `ollama pull llama3.2`.
2. Make sure Ollama is running, then open the **ai** page. It detects your installed models.

If you host the site somewhere other than `localhost`, start Ollama with `OLLAMA_ORIGINS=https://your-site.example` so the browser is allowed to call it.

For Anthropic or OpenAI-compatible providers, add your key in Settings. Keys are stored only in your browser's localStorage and are never included in exports.

## Scripts

| Command             | What it does              |
| ------------------- | ------------------------- |
| `npm run dev`       | Start the dev server      |
| `npm run build`     | Typecheck and build       |
| `npm run typecheck` | TypeScript check only     |
| `npm run lint`      | ESLint                    |
| `npm test`          | Unit tests (Vitest)       |

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Zustand (persisted state), Recharts, Vitest.

## Project layout

```
src/
  engine/       typing state machine, metrics, text sources (unit tested)
  ai/           Ollama / Anthropic / OpenAI-compatible providers, prompt builder
  data/         word lists and the text library (JSON)
  store/        settings and stats (localStorage)
  components/   typing area, config bar, results, command palette
  routes/       type, library, generate, profile, settings
  themes/       theme and font definitions
```

## Known limitations

- Physical keyboards only for now; on-screen phone keyboards are not fully supported by the typing input.
- The word lists are "easy" (200 common words) and "wide" (about 950 words); there is no 5,000-word list yet.

## License

See [LICENSE](./LICENSE).
