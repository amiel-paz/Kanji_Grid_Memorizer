import type { UserProgress } from '../domain/types';
import { createLocalStore } from '../lib/localStore';

export const progressStore = createLocalStore<Record<string, UserProgress>>(
  'kanji-grid-progress-v0',
);

// TODO: Wrap this in a small React context after progress editing exists.
