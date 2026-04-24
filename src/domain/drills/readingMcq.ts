import type { KanjiEntry } from '../content/types';

export const READING_MCQ_CHOICE_COUNT = 4;
export const READING_MCQ_DISTRACTOR_COUNT = READING_MCQ_CHOICE_COUNT - 1;

export function buildReadingMcqChoiceMap(
  selectedEntries: readonly KanjiEntry[],
  choicePoolEntries: readonly KanjiEntry[],
  random: () => number = Math.random,
): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(
    selectedEntries.map((entry) => [
      entry.kanji,
      buildReadingMcqChoices(entry, choicePoolEntries, random),
    ]),
  );
}

export function buildReadingMcqChoices(
  targetEntry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[],
  random: () => number = Math.random,
): readonly string[] {
  const distractors = selectReadingMcqDistractors(
    targetEntry,
    choicePoolEntries,
    READING_MCQ_DISTRACTOR_COUNT,
    random,
  );

  return shuffleValues(
    [targetEntry.kanji, ...distractors.map((entry) => entry.kanji)],
    random,
  );
}

export function selectReadingMcqDistractors(
  targetEntry: KanjiEntry,
  choicePoolEntries: readonly KanjiEntry[],
  count: number,
  random: () => number = Math.random,
): readonly KanjiEntry[] {
  return [...choicePoolEntries]
    .filter((candidate) => candidate.kanji !== targetEntry.kanji)
    .map((candidate) => ({
      candidate,
      confusabilityScore: getReadingConfusabilityScore(targetEntry, candidate),
      tieBreaker: random(),
    }))
    .sort(
      (left, right) =>
        left.confusabilityScore - right.confusabilityScore ||
        left.tieBreaker - right.tieBreaker,
    )
    .slice(0, count)
    .map(({ candidate }) => candidate);
}

export function getReadingConfusabilityScore(
  targetEntry: KanjiEntry,
  candidateEntry: KanjiEntry,
): number {
  const targetReadings = normalizeEntryReadings(targetEntry);
  const candidateReadings = normalizeEntryReadings(candidateEntry);

  if (targetReadings.length === 0 || candidateReadings.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return targetReadings.reduce(
    (sum, targetReading) =>
      sum + Math.min(...candidateReadings.map((candidateReading) => levenshteinDistance(targetReading, candidateReading))),
    0,
  );
}

function normalizeEntryReadings(entry: KanjiEntry): readonly string[] {
  return Array.from(
    new Set(
      [...entry.onyomi, ...entry.kunyomi]
        .map((reading) => normalizeReadingForComparison(reading))
        .filter((reading) => reading.length > 0),
    ),
  );
}

function normalizeReadingForComparison(reading: string): string {
  return Array.from(reading.normalize('NFKC').toLowerCase())
    .filter((character) => !isIgnoredReadingCharacter(character))
    .map(convertKatakanaToHiragana)
    .join('');
}

function isIgnoredReadingCharacter(character: string): boolean {
  return character === '.' || character === '・' || character === '、' || character === '-';
}

function convertKatakanaToHiragana(character: string): string {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return character;
  }

  if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
    return String.fromCodePoint(codePoint - 0x60);
  }

  return character;
}

function levenshteinDistance(left: string, right: string): number {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  const previousRow = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < leftCharacters.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0] ?? 0;
    previousRow[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < rightCharacters.length; rightIndex += 1) {
      const currentValue = previousRow[rightIndex + 1] ?? 0;
      const substitutionCost = leftCharacters[leftIndex] === rightCharacters[rightIndex] ? 0 : 1;

      previousRow[rightIndex + 1] = Math.min(
        (previousRow[rightIndex] ?? 0) + 1,
        currentValue + 1,
        previousDiagonal + substitutionCost,
      );
      previousDiagonal = currentValue;
    }
  }

  return previousRow[rightCharacters.length] ?? 0;
}

function shuffleValues<T>(values: readonly T[], random: () => number): readonly T[] {
  const nextValues = [...values];

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const currentValue = nextValues[index];
    nextValues[index] = nextValues[swapIndex] as T;
    nextValues[swapIndex] = currentValue as T;
  }

  return nextValues;
}
