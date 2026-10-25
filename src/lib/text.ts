/** Normalize pasted/generated text to what a keyboard can actually produce. */
export function normalizeTypeable(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2000-\u200B\u202F]/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

export const MAX_CUSTOM_CHARS = 3000;
