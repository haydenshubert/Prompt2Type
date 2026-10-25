import { normalizeTypeable } from '../lib/text';

export type Tone = 'story' | 'informative' | 'funny' | 'dramatic';
export type AiLength = 'short' | 'medium' | 'long';
export type Vocabulary = 'simple' | 'rich';

export interface GenerateRequest {
  topic: string;
  tone: Tone;
  length: AiLength;
  vocabulary: Vocabulary;
}

export const TARGET_WORDS: Record<AiLength, number> = {
  short: 40,
  medium: 90,
  long: 160,
};

const TONE_HINT: Record<Tone, string> = {
  story: 'a short story with a beginning, a middle, and an end',
  informative: 'an engaging, accurate explanation in plain prose',
  funny: 'a lighthearted and humorous piece',
  dramatic: 'a vivid, dramatic piece with strong imagery',
};

export const SYSTEM_PROMPT =
  'You write practice passages for a typing test. Reply with only the passage itself: ' +
  'one continuous paragraph of plain text. No title, no heading, no list, no markdown, ' +
  'no quotation marks around the passage, no introduction, and no closing remark. ' +
  'Use only standard keyboard characters (letters, digits, and common punctuation).';

export const SURPRISE_TOPICS = [
  'a lighthouse that only appears during storms',
  'the secret life of vending machines',
  'a detective who is afraid of mysteries',
  'what the ocean sounds like at night',
  'a robot learning to bake bread',
  'the history of the paper clip',
  'a town where it rains only on Tuesdays',
  'why cats knock things off tables',
  'a dragon who runs a small bookstore',
  'the first person to taste a mango',
  'a train that travels between seasons',
  'how bees dance to give directions',
  'an astronaut who forgot their lunch',
  'a mountain village that hosts a yearly kite festival',
  'the invention of the umbrella',
  'a library where books whisper at night',
  'a squirrel planning the perfect winter',
  'life on a floating city above the clouds',
  'a chef cooking for a very picky ghost',
  'how a thunderstorm actually forms',
];

export function randomTopic(exclude?: string): string {
  const pool = SURPRISE_TOPICS.filter((t) => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildUserPrompt(req: GenerateRequest): string {
  const words = TARGET_WORDS[req.length];
  const vocab =
    req.vocabulary === 'simple'
      ? 'Use short, common words and simple sentences.'
      : 'Use rich, varied vocabulary and a mix of sentence lengths.';
  const topic = req.topic.trim()
    ? `Topic: ${req.topic.trim()}`
    : 'Topic: anything surprising and interesting. Choose it yourself.';
  return [
    `Write ${TONE_HINT[req.tone]} of about ${words} words.`,
    topic,
    vocab,
  ].join('\n');
}

/**
 * Cleans model output down to a single typeable paragraph: removes
 * "Here is..." preambles, markdown, headings, and wrapping quotes.
 */
export function sanitizeGenerated(raw: string): string {
  let text = raw.replace(/\r/g, '').trim();
  // Drop a leading preamble line such as "Here is your paragraph:".
  text = text.replace(/^(sure|certainly|okay|ok|here(?:'s| is| are)[^\n]*?)[:!.]?\s*\n+/i, '');
  // Drop headings and markdown decoration.
  text = text
    .split('\n')
    .filter((line) => !/^\s*#{1,6}\s/.test(line))
    .join('\n')
    .replace(/(\*\*|__|\*|_|`)/g, '');
  text = normalizeTypeable(text);
  // Remove quotes wrapping the entire passage.
  if (/^"[^"]*"$/.test(text)) text = text.slice(1, -1).trim();
  return text;
}
