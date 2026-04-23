import type { KanjiEntry } from '../content/types';
import { hasSeenProgress } from './progress';
import type { UserProgress } from './types';

export interface SeenLibraryItem {
  readonly entry: KanjiEntry;
  readonly progress: UserProgress;
}

export function getSeenLibraryItems(
  entries: readonly KanjiEntry[],
  progressByKanji: Readonly<Record<string, UserProgress>>,
): SeenLibraryItem[] {
  return entries
    .flatMap((entry) => {
      const progress = progressByKanji[entry.kanji];

      if (!progress || !hasSeenProgress(progress)) {
        return [];
      }

      return [{ entry, progress }];
    })
    .sort(compareSeenLibraryItems);
}

function compareSeenLibraryItems(left: SeenLibraryItem, right: SeenLibraryItem): number {
  return (
    compareTimestampsDescending(left.progress.lastSeenAt, right.progress.lastSeenAt) ||
    compareTimestampsDescending(left.progress.firstSeenAt, right.progress.firstSeenAt) ||
    right.progress.seenCount - left.progress.seenCount ||
    left.entry.canonicalIndex - right.entry.canonicalIndex
  );
}

function compareTimestampsDescending(left?: string, right?: string): number {
  const leftValue = toSortableTimestamp(left);
  const rightValue = toSortableTimestamp(right);

  return rightValue - leftValue;
}

function toSortableTimestamp(timestamp?: string): number {
  if (!timestamp) {
    return Number.NEGATIVE_INFINITY;
  }

  const value = Date.parse(timestamp);

  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}
