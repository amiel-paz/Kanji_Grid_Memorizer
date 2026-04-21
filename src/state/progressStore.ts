import type { UserProgress } from '../domain/progress/types';
import { createLocalStore } from '../lib/localStore';

export const progressStore = createLocalStore<Record<string, UserProgress>>(
  'kanji-grid-progress-v0',
  {
    validate: isUserProgressRecord,
  },
);

// TODO: Wrap this in a small React context after progress editing exists.

function isUserProgressRecord(value: unknown): value is Record<string, UserProgress> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([kanji, progress]) => isUserProgress(progress) && progress.kanji === kanji);
}

function isUserProgress(value: unknown): value is UserProgress {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.kanji !== 'string') {
    return false;
  }

  if (!isFiniteNumber(value.seenCount) || !isFiniteNumber(value.goodCount)) {
    return false;
  }

  if (
    value.lastSeenAt !== undefined &&
    typeof value.lastSeenAt !== 'string'
  ) {
    return false;
  }

  return value.confidence === 'new' || value.confidence === 'learning' || value.confidence === 'familiar';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
