import { applyReviewOutcome, createInitialProgress } from '../domain/progress/progress';
import type { UserProgress } from '../domain/progress/types';
import type { SessionAnswerEvent } from '../domain/session/types';
import { createLocalStore } from '../lib/localStore';

export const progressStore = createLocalStore<Record<string, UserProgress>>(
  'kanji-grid-progress-v0',
  {
    validate: isUserProgressRecord,
  },
);

// If progress editing grows beyond page-local state later, a small React context may help.

export type ProgressByKanji = Readonly<Record<string, UserProgress>>;

export function loadProgressRecords(): ProgressByKanji {
  return progressStore.load() ?? {};
}

export function applyReviewEventToProgressRecords(
  progressByKanji: ProgressByKanji,
  event: SessionAnswerEvent,
  reviewedAt?: string,
): Record<string, UserProgress> {
  const currentProgress = progressByKanji[event.kanji] ?? createInitialProgress(event.kanji);
  const nextProgress = applyReviewOutcome(currentProgress, {
    kanji: event.kanji,
    reviewGrade: event.reviewGrade,
    previousCueOpacity: event.previousCueOpacity,
    nextCueOpacity: event.nextCueOpacity,
    reviewedAt,
  });

  return {
    ...progressByKanji,
    [event.kanji]: nextProgress,
  };
}

export function persistReviewEventToProgressStore(
  progressByKanji: ProgressByKanji,
  event: SessionAnswerEvent,
  reviewedAt?: string,
): Record<string, UserProgress> {
  const nextProgressByKanji = applyReviewEventToProgressRecords(progressByKanji, event, reviewedAt);
  progressStore.save(nextProgressByKanji);
  return nextProgressByKanji;
}

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
