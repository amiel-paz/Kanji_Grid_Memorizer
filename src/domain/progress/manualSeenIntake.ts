import type { KanjiEntry } from '../content/types';
import { hasSeenProgress } from './progress';
import type { UserProgress } from './types';

export function getManualSeenIntakeEntries(
  entries: readonly KanjiEntry[],
  progressByKanji: Readonly<Record<string, UserProgress>>,
  searchTerm = '',
): KanjiEntry[] {
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();

  return entries
    .filter((entry) => !hasSeenProgress(progressByKanji[entry.kanji]))
    .filter((entry) => matchesSearchTerm(entry, normalizedSearchTerm))
    .sort((left, right) => left.canonicalIndex - right.canonicalIndex);
}

function matchesSearchTerm(entry: KanjiEntry, normalizedSearchTerm: string): boolean {
  if (normalizedSearchTerm.length === 0) {
    return true;
  }

  return (
    entry.kanji.includes(normalizedSearchTerm) ||
    entry.onyomi.some((reading) =>
      reading.toLocaleLowerCase().includes(normalizedSearchTerm),
    ) ||
    entry.kunyomi.some((reading) =>
      reading.toLocaleLowerCase().includes(normalizedSearchTerm),
    ) ||
    entry.meanings.some((meaning) =>
      meaning.toLocaleLowerCase().includes(normalizedSearchTerm),
    )
  );
}
