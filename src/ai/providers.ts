import type { Settings } from '../store/settings';
import {
  SYSTEM_PROMPT,
  TARGET_WORDS,
  buildUserPrompt,
  sanitizeGenerated,
  type GenerateRequest,
} from './promptBuilder';

export type AiErrorKind = 'unreachable' | 'auth' | 'http' | 'empty' | 'config';

export class AiError extends Error {
  kind: AiErrorKind;
  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'AiError';
  }
}

const trimSlash = (u: string) => u.replace(/\/+$/, '');

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new AiError('unreachable', `Could not reach ${new URL(url).host}.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AiError('auth', 'The provider rejected the API key.');
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AiError('http', `Provider returned ${res.status}. ${detail.slice(0, 200)}`);
  }
  return res.json();
}

/** Models installed in a local Ollama server; throws AiError if it isn't running. */
export async function listOllamaModels(baseUrl: string, signal?: AbortSignal): Promise<string[]> {
  let res: Response;
  try {
    res = await fetch(`${trimSlash(baseUrl)}/api/tags`, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new AiError('unreachable', 'Ollama is not reachable.');
  }
  if (!res.ok) throw new AiError('http', `Ollama returned ${res.status}.`);
  const data = (await res.json()) as { models?: { name: string }[] };
  return (data.models ?? []).map((m) => m.name);
}

async function viaOllama(s: Settings, req: GenerateRequest, signal?: AbortSignal) {
  if (!s.ollamaModel) throw new AiError('config', 'Choose an Ollama model first.');
  const data = (await post(
    `${trimSlash(s.ollamaUrl)}/api/generate`,
    {},
    {
      model: s.ollamaModel,
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(req),
      stream: false,
      options: { temperature: 0.9, num_predict: TARGET_WORDS[req.length] * 3 },
    },
    signal
  )) as { response?: string };
  return data.response ?? '';
}

async function viaAnthropic(s: Settings, req: GenerateRequest, signal?: AbortSignal) {
  if (!s.anthropicKey) throw new AiError('config', 'Add your Anthropic API key in settings.');
  const data = (await post(
    'https://api.anthropic.com/v1/messages',
    {
      'x-api-key': s.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model: s.anthropicModel,
      max_tokens: TARGET_WORDS[req.length] * 4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(req) }],
    },
    signal
  )) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('');
}

async function viaOpenAi(s: Settings, req: GenerateRequest, signal?: AbortSignal) {
  if (!s.openaiUrl) throw new AiError('config', 'Add a base URL in settings.');
  const data = (await post(
    `${trimSlash(s.openaiUrl)}/chat/completions`,
    s.openaiKey ? { Authorization: `Bearer ${s.openaiKey}` } : {},
    {
      model: s.openaiModel,
      max_tokens: TARGET_WORDS[req.length] * 4,
      temperature: 0.9,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(req) },
      ],
    },
    signal
  )) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Generates a typing passage with the user's configured provider. */
export async function generateText(
  settings: Settings,
  req: GenerateRequest,
  signal?: AbortSignal
): Promise<string> {
  const raw =
    settings.provider === 'ollama'
      ? await viaOllama(settings, req, signal)
      : settings.provider === 'anthropic'
        ? await viaAnthropic(settings, req, signal)
        : await viaOpenAi(settings, req, signal);
  const text = sanitizeGenerated(raw);
  if (text.split(/\s+/).length < 5) {
    throw new AiError('empty', 'The model returned no usable text. Try again.');
  }
  return text;
}
