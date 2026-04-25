import type { KanjiEntry } from '../content/types';
import {
  hasSeenProgress,
  isReviewBankCandidateProgress,
  isUnfinishedNewItemProgress,
} from '../progress/progress';
import { DEFAULT_DAILY_NEW_KANJI_LIMIT, type SessionProgressSeed, type SessionProgressSeedByKanji } from './types';

export type SessionRandomSource = () => number;

export interface SelectSessionEntriesOptions {
  readonly random?: SessionRandomSource;
  readonly progressByKanji?: SessionProgressSeedByKanji;
  readonly createdAt?: string;
  readonly dailyNewLimit?: number;
}

export interface SessionSelectionPrelude {
  readonly carryoverSelection: readonly KanjiEntry[];
  readonly freshNewSelection: readonly KanjiEntry[];
  readonly reviewBankEntries: readonly KanjiEntry[];
  readonly remainingDeckSlots: number;
}

export function selectSessionEntries(
  entries: readonly KanjiEntry[],
  deckSize: number,
  options: SelectSessionEntriesOptions = {},
): readonly KanjiEntry[] {
  const random = options.random ?? Math.random;
  const progressByKanji = options.progressByKanji ?? {};
  const prelude = buildSessionSelectionPrelude(entries, deckSize, options);
  const reviewBankSelection = selectPriorityReviewEntries(
    prelude.reviewBankEntries,
    prelude.remainingDeckSlots,
    progressByKanji,
    random,
  );

  return [...prelude.carryoverSelection, ...prelude.freshNewSelection, ...reviewBankSelection];
}

export function buildSessionSelectionPrelude(
  entries: readonly KanjiEntry[],
  deckSize: number,
  options: SelectSessionEntriesOptions = {},
): SessionSelectionPrelude {
  const random = options.random ?? Math.random;
  const progressByKanji = options.progressByKanji ?? {};
  const selectionSize = Math.min(deckSize, entries.length);
  const todayKey = toLocalDateKey(options.createdAt ?? new Date().toISOString());
  const { carryoverEntries, reviewBankEntries, trulyNewEntries } = partitionEntriesForSessionCreation(
    entries,
    progressByKanji,
  );
  const carryoverSelection = selectRandomEntries(carryoverEntries, selectionSize, random);
  const olderCarryoverCount = carryoverSelection.filter((entry) => {
    const progress = progressByKanji[entry.kanji];
    return !progress || !isFirstSeenOnLocalDate(progress, todayKey);
  }).length;
  const remainingDeckSlots = selectionSize - carryoverSelection.length;
  const remainingDailyNewAllowance = Math.max(
    0,
    getRemainingDailyNewAllowance(progressByKanji, options.createdAt, options.dailyNewLimit) -
      olderCarryoverCount,
  );
  const freshNewSelection = selectRandomEntries(
    trulyNewEntries,
    Math.min(remainingDeckSlots, remainingDailyNewAllowance),
    random,
  );

  return {
    carryoverSelection,
    freshNewSelection,
    reviewBankEntries,
    remainingDeckSlots: remainingDeckSlots - freshNewSelection.length,
  };
}

export function partitionEntriesForSessionCreation(
  entries: readonly KanjiEntry[],
  progressByKanji: SessionProgressSeedByKanji,
): {
  readonly carryoverEntries: readonly KanjiEntry[];
  readonly reviewBankEntries: readonly KanjiEntry[];
  readonly trulyNewEntries: readonly KanjiEntry[];
} {
  const carryoverEntries: KanjiEntry[] = [];
  const reviewBankEntries: KanjiEntry[] = [];
  const trulyNewEntries: KanjiEntry[] = [];

  for (const entry of entries) {
    const progress = progressByKanji[entry.kanji];

    if (isUnfinishedNewItemProgress(progress)) {
      carryoverEntries.push(entry);
      continue;
    }

    if (isReviewBankCandidateProgress(progress)) {
      reviewBankEntries.push(entry);
      continue;
    }

    if (!hasSeenProgress(progress)) {
      trulyNewEntries.push(entry);
    }
  }

  return {
    carryoverEntries,
    reviewBankEntries,
    trulyNewEntries,
  };
}

export function selectPriorityReviewEntries(
  entries: readonly KanjiEntry[],
  count: number,
  progressByKanji: SessionProgressSeedByKanji,
  random: SessionRandomSource,
): readonly KanjiEntry[] {
  if (count <= 0 || entries.length === 0) {
    return [];
  }

  return [...entries]
    .map((entry) => ({
      entry,
      recentReviewFailureCount: progressByKanji[entry.kanji]?.recentReviewFailureCount ?? 0,
      lastReviewFailureAt: toSortableTimestamp(progressByKanji[entry.kanji]?.lastReviewFailureAt),
      tieBreaker: random(),
    }))
    .sort(
      (left, right) =>
        right.recentReviewFailureCount - left.recentReviewFailureCount ||
        right.lastReviewFailureAt - left.lastReviewFailureAt ||
        left.tieBreaker - right.tieBreaker,
    )
    .slice(0, count)
    .map(({ entry }) => entry);
}

export function selectRandomEntries(
  entries: readonly KanjiEntry[],
  count: number,
  random: SessionRandomSource,
): readonly KanjiEntry[] {
  const remainingEntries = [...entries];
  const selected: KanjiEntry[] = [];

  while (selected.length < count && remainingEntries.length > 0) {
    const selectedIndex = Math.floor(random() * remainingEntries.length);
    const [entry] = remainingEntries.splice(selectedIndex, 1);

    if (!entry) {
      throw new Error(`Session selection produced an invalid index: ${selectedIndex}`);
    }

    selected.push(entry);
  }

  return selected;
}

export function getRemainingDailyNewAllowance(
  progressByKanji: SessionProgressSeedByKanji,
  createdAt: string | undefined,
  dailyNewLimit: number | undefined,
): number {
  const todayKey = toLocalDateKey(createdAt ?? new Date().toISOString());
  const consumedTodayCount = Object.values(progressByKanji).filter((progress) =>
    isFirstSeenOnLocalDate(progress, todayKey),
  ).length;

  return Math.max(0, (dailyNewLimit ?? DEFAULT_DAILY_NEW_KANJI_LIMIT) - consumedTodayCount);
}

export function toLocalDateKey(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.valueOf())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function isFirstSeenOnLocalDate(progress: SessionProgressSeed, localDateKey: string): boolean {
  return hasSeenProgress(progress) && progress.firstSeenAt !== undefined && toLocalDateKey(progress.firstSeenAt) === localDateKey;
}

function toSortableTimestamp(timestamp: string | undefined): number {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.valueOf()) ? Number.NEGATIVE_INFINITY : date.valueOf();
}

