import type { KanjiEntry } from '../content/types';
import { hasSeenProgress } from './progress';
import type { UserProgress } from './types';

export interface LoadfileSummary {
  readonly seenKanjiCount: number;
  readonly unseenKanjiCount: number;
  readonly totalKanjiCount: number;
}

export function summarizeLoadfileProgress(
  entries: readonly KanjiEntry[],
  progressByKanji: Readonly<Record<string, UserProgress>>,
): LoadfileSummary {
  const seenKanjiCount = entries.reduce(
    (count, entry) => count + (hasSeenProgress(progressByKanji[entry.kanji]) ? 1 : 0),
    0,
  );

  return {
    seenKanjiCount,
    unseenKanjiCount: Math.max(0, entries.length - seenKanjiCount),
    totalKanjiCount: entries.length,
  };
}
