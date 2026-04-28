import { afterEach, describe, expect, it } from 'vitest';
import type { KanjiEntry } from '../src/domain/content/types';
import {
  buildReadingMcqChoices,
  getReadingMcqPromptReadings,
  getReadingConfusabilityScore,
  setGlyphSignatureResolverForTesting,
  selectReadingMcqDistractors,
} from '../src/domain/drills/readingMcq';

describe('reading MCQ helpers', () => {
  afterEach(() => {
    setGlyphSignatureResolverForTesting(null);
  });

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

    expect(
      getReadingConfusabilityScore(target, normalizedMatch, [target, normalizedMatch, distantCandidate]),
    ).toBeLessThan(
      getReadingConfusabilityScore(target, distantCandidate, [target, normalizedMatch, distantCandidate]),
    );
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

  it('uses representative variant readings for no-reading entries and excludes equivalent variants', () => {
    const target = buildEntry({
      kanji: '歷',
      canonicalIndex: 0,
      meanings: ['take place', 'past', 'history'],
      onyomi: [],
      kunyomi: [],
    });
    const representative = buildEntry({
      kanji: '歴',
      canonicalIndex: 1,
      meanings: ['curriculum', 'continuation', 'passage of time'],
      onyomi: ['レキ'],
      kunyomi: [],
    });
    const closestCandidate = buildEntry({
      kanji: '暦',
      canonicalIndex: 2,
      meanings: ['calendar'],
      onyomi: ['レキ'],
      kunyomi: ['こよみ'],
    });
    const secondClosestCandidate = buildEntry({
      kanji: '力',
      canonicalIndex: 3,
      meanings: ['power'],
      onyomi: ['リキ'],
      kunyomi: ['ちから'],
    });
    const distantCandidate = buildEntry({
      kanji: '水',
      canonicalIndex: 4,
      meanings: ['water'],
      onyomi: ['スイ'],
      kunyomi: ['みず'],
    });

    const distractors = selectReadingMcqDistractors(
      target,
      [target, representative, closestCandidate, secondClosestCandidate, distantCandidate],
      2,
      () => 0,
    );

    expect(distractors.map((entry) => entry.kanji)).toEqual(['暦', '力']);
    expect(distractors.map((entry) => entry.kanji)).not.toContain('歴');
  });

  it('falls back to meanings when neither side has usable readings', () => {
    const target = buildEntry({
      kanji: '仮甲',
      canonicalIndex: 0,
      meanings: ['art history'],
      onyomi: [],
      kunyomi: [],
    });
    const closeMeaningCandidate = buildEntry({
      kanji: '仮乙',
      canonicalIndex: 1,
      meanings: ['history art'],
      onyomi: [],
      kunyomi: [],
    });
    const distantMeaningCandidate = buildEntry({
      kanji: '仮丙',
      canonicalIndex: 2,
      meanings: ['water'],
      onyomi: [],
      kunyomi: [],
    });

    expect(
      getReadingConfusabilityScore(
        target,
        closeMeaningCandidate,
        [target, closeMeaningCandidate, distantMeaningCandidate],
      ),
    ).toBeLessThan(
      getReadingConfusabilityScore(
        target,
        distantMeaningCandidate,
        [target, closeMeaningCandidate, distantMeaningCandidate],
      ),
    );
  });

  it('exposes representative readings for the MCQ prompt when the local entry has none', () => {
    const target = buildEntry({
      kanji: '廊',
      canonicalIndex: 0,
      meanings: ['corridor', 'porch', 'veranda'],
      onyomi: [],
      kunyomi: [],
    });
    const representative = buildEntry({
      kanji: '廊',
      canonicalIndex: 1,
      meanings: ['corridor', 'hall', 'tower'],
      onyomi: ['ロウ'],
      kunyomi: [],
    });

    expect(getReadingMcqPromptReadings(target, [target, representative])).toEqual({
      onyomi: ['ロウ'],
      kunyomi: [],
    });
  });

  it('uses visual confusability as the main scorer when glyph signatures are available', () => {
    setGlyphSignatureResolverForTesting((kanji) => {
      switch (kanji) {
        case '輪':
          return [0, 1];
        case '輸':
          return [0, 0.95];
        case '隣':
          return [0.2, 0.8];
        case '羽':
          return [1, 1];
        default:
          return null;
      }
    });

    const target = buildEntry({
      kanji: '輪',
      canonicalIndex: 0,
      meanings: ['wheel'],
      onyomi: ['リン'],
      kunyomi: ['わ'],
    });
    const visualNearCandidate = buildEntry({
      kanji: '輸',
      canonicalIndex: 1,
      meanings: ['transport'],
      onyomi: ['ユ'],
      kunyomi: [],
    });
    const readingNearCandidate = buildEntry({
      kanji: '隣',
      canonicalIndex: 2,
      meanings: ['neighbor'],
      onyomi: ['リン'],
      kunyomi: ['となり'],
    });
    const distantCandidate = buildEntry({
      kanji: '羽',
      canonicalIndex: 3,
      meanings: ['feather'],
      onyomi: ['ウ'],
      kunyomi: ['は', 'わ'],
    });

    const distractors = selectReadingMcqDistractors(
      target,
      [target, visualNearCandidate, readingNearCandidate, distantCandidate],
      2,
      () => 0,
    );

    expect(distractors.map((entry) => entry.kanji)).toEqual(['輸', '隣']);
  });

  it('falls back to reading confusability when visual signatures are unavailable', () => {
    setGlyphSignatureResolverForTesting(() => null);

    const target = buildEntry({
      kanji: '輪',
      canonicalIndex: 0,
      meanings: ['wheel'],
      onyomi: ['リン'],
      kunyomi: ['わ'],
    });
    const readingNearCandidate = buildEntry({
      kanji: '隣',
      canonicalIndex: 1,
      meanings: ['neighbor'],
      onyomi: ['リン'],
      kunyomi: ['となり'],
    });
    const distantCandidate = buildEntry({
      kanji: '水',
      canonicalIndex: 2,
      meanings: ['water'],
      onyomi: ['スイ'],
      kunyomi: ['みず'],
    });

    expect(
      getReadingConfusabilityScore(target, readingNearCandidate, [
        target,
        readingNearCandidate,
        distantCandidate,
      ]),
    ).toBeLessThan(
      getReadingConfusabilityScore(target, distantCandidate, [
        target,
        readingNearCandidate,
        distantCandidate,
      ]),
    );
  });
});

function buildEntry({
  kanji,
  canonicalIndex,
  meanings = [kanji],
  onyomi,
  kunyomi,
  sourceSet = 'joyo',
  metadata,
}: {
  kanji: string;
  canonicalIndex: number;
  meanings?: readonly string[];
  onyomi: readonly string[];
  kunyomi: readonly string[];
  sourceSet?: KanjiEntry['sourceSet'];
  metadata?: KanjiEntry['metadata'];
}): KanjiEntry {
  return {
    kanji,
    canonicalIndex,
    sourceSet,
    sourceSetVersionId: 'joyo-test',
    assignmentVersionId: 'assignment-test',
    code: [0, 0, 0, 0],
    meanings,
    onyomi,
    kunyomi,
    tags: [],
    ...(metadata ? { metadata } : {}),
  };
}
