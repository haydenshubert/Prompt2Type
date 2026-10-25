import type { LibraryText } from '../../lib/types';
import stories from './stories.json';
import science from './science.json';
import history from './history.json';
import quotes from './quotes.json';
import twisters from './twisters.json';
import tech from './tech.json';
import weird from './weird.json';
import fables from './fables.json';

export const LIBRARY: LibraryText[] = [
  ...stories,
  ...science,
  ...history,
  ...quotes,
  ...twisters,
  ...tech,
  ...weird,
  ...fables,
] as LibraryText[];

export const getLibraryText = (id: string) => LIBRARY.find((t) => t.id === id);
