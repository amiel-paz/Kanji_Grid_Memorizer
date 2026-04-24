import { describe, expect, it } from 'vitest';
import type { KanjiEntry } from '../src/domain/content/types';
import {
  buildReadingMcqChoices,
  getReadingConfusabilityScore,
  selectReadingMcqDistractors,
} from '../src/domain/drills/readingMcq';

describe('reading MCQ helpers', () => {
  it('normalizes kana script and okurigana punctuation before comparing readings', () => {
    const target = buildEntry({
      kanji: '足',
      canonicalIndex: 0,
      onyomi: ['ソク'],
      kunyomi: ['た.りる'],
    });
    const normalizedMatch = buildEntry({
      kanji: '足候補',
      canonicalIndex: 1,
      onyomi: ['そく'],
      kunyomi: ['たりる'],
    });
    const distantCandidate = buildEntry({
      kanji: '水',
      canonicalIndex: 2,
      onyomi: ['スイ'],
      kunyomi: ['みず'],
    });

    expect(getReadingConfusabilityScore(target, normalizedMatch)).toBe(0);
    expect(getReadingConfusabilityScore(target, distantCandidate)).toBeGreaterThan(0);
  });

  it('chooses the three smallest-distance distractors from the local reading data', () => {
    const target = buildEntry({
      kanji: '口',
      canonicalIndex: 0,
      onyomi: ['コウ'],
      kunyomi: ['くち'],
    });
    const closestEntries = [
      buildEntry({
        kanji: '候補A',
        canonicalIndex: 1,
        onyomi: ['コウ'],
        kunyomi: ['くに'],
      }),
      buildEntry({
        kanji: '候補B',
        canonicalIndex: 2,
        onyomi: ['コク'],
        kunyomi: ['くち'],
      }),
      buildEntry({
        kanji: '候補C',
        canonicalIndex: 3,
        onyomi: ['コ'],
        kunyomi: ['くち'],
      }),
    ];
    const distantEntry = buildEntry({
      kanji: '水',
      canonicalIndex: 4,
      onyomi: ['スイ'],
      kunyomi: ['みず'],
    });

    const distractors = selectReadingMcqDistractors(
      target,
      [target, ...closestEntries, distantEntry],
      3,
      () => 0,
    );

    expect(distractors.map((entry) => entry.kanji)).toEqual(
      closestEntries.map((entry) => entry.kanji),
    );
  });

  it('builds four choices that always include the target kanji', () => {
    const entries = [
      buildEntry({ kanji: '口', canonicalIndex: 0, onyomi: ['コウ'], kunyomi: ['くち'] }),
      buildEntry({ kanji: '校', canonicalIndex: 1, onyomi: ['コウ'], kunyomi: [] }),
      buildEntry({ kanji: '石', canonicalIndex: 2, onyomi: ['セキ'], kunyomi: ['いし'] }),
      buildEntry({ kanji: '工', canonicalIndex: 3, onyomi: ['コウ'], kunyomi: [] }),
    ];

    const choices = buildReadingMcqChoices(entries[0]!, entries, () => 0);

    expect(choices).toHaveLength(4);
    expect(choices).toContain('口');
    expect(new Set(choices)).toHaveLength(4);
  });
});

function buildEntry({
  kanji,
  canonicalIndex,
  onyomi,
  kunyomi,
}: {
  kanji: string;
  canonicalIndex: number;
  onyomi: readonly string[];
  kunyomi: readonly string[];
}): KanjiEntry {
  return {
    kanji,
    canonicalIndex,
    sourceSet: 'joyo',
    sourceSetVersionId: 'joyo-test',
    assignmentVersionId: 'assignment-test',
    code: [0, 0, 0, 0],
    meanings: [kanji],
    onyomi,
    kunyomi,
    tags: [],
  };
}
