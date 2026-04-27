import {
  applyReviewOutcome,
  createInitialProgress,
  recordSeen,
} from '../domain/progress/progress';
import type { UserProgress } from '../domain/progress/types';
import type { SessionAnswerEvent } from '../domain/session/types';
import { createLocalStore, type LocalStore } from '../lib/localStore';

export const DEFAULT_PROGRESS_STORAGE_KEY = 'kanji-grid-progress-v0';

export function createProgressStore(
  storageKey: string = DEFAULT_PROGRESS_STORAGE_KEY,
): LocalStore<Record<string, UserProgress>> {
  return createLocalStore<Record<string, UserProgress>>(storageKey, {
    validate: isUserProgressRecord,
  });
}

export const progressStore = createProgressStore();

// If progress editing grows beyond page-local state later, a small React context may help.

export type ProgressByKanji = Readonly<Record<string, UserProgress>>;

export function loadProgressRecords(
  store: LocalStore<Record<string, UserProgress>> = progressStore,
): ProgressByKanji {
  return store.load() ?? {};
}

export function applyReviewEventToProgressRecords(
  progressByKanji: ProgressByKanji,
  event: SessionAnswerEvent,
  reviewedAt?: string,
): Record<string, UserProgress> {
  const currentProgress = progressByKanji[event.kanji] ?? createInitialProgress(event.kanji);
  const nextProgress = applyReviewOutcome(currentProgress, {
    kanji: event.kanji,
    drillMode: event.drillMode,
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
  store: LocalStore<Record<string, UserProgress>> = progressStore,
): Record<string, UserProgress> {
  const nextProgressByKanji = applyReviewEventToProgressRecords(progressByKanji, event, reviewedAt);
  store.save(nextProgressByKanji);
  return nextProgressByKanji;
}

export function applyManualSeenToProgressRecords(
  progressByKanji: ProgressByKanji,
  kanji: string,
  seenAt?: string,
): Record<string, UserProgress> {
  const currentProgress = progressByKanji[kanji] ?? createInitialProgress(kanji);

  return {
    ...progressByKanji,
    [kanji]: recordSeen(currentProgress, seenAt),
  };
}

export function persistManualSeenToProgressStore(
  progressByKanji: ProgressByKanji,
  kanji: string,
  seenAt?: string,
  store: LocalStore<Record<string, UserProgress>> = progressStore,
): Record<string, UserProgress> {
  const nextProgressByKanji = applyManualSeenToProgressRecords(
    progressByKanji,
    kanji,
    seenAt,
  );
  store.save(nextProgressByKanji);
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
    value.firstSeenAt !== undefined &&
    typeof value.firstSeenAt !== 'string'
  ) {
    return false;
  }

  if (
    value.lastSeenAt !== undefined &&
    typeof value.lastSeenAt !== 'string'
  ) {
    return false;
  }

  if (
    value.reviewBankCandidate !== undefined &&
    typeof value.reviewBankCandidate !== 'boolean'
  ) {
    return false;
  }

  if (
    value.recentReviewFailureCount !== undefined &&
    !isFiniteNumber(value.recentReviewFailureCount)
  ) {
    return false;
  }

  if (
    value.lastReviewFailureAt !== undefined &&
    typeof value.lastReviewFailureAt !== 'string'
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
