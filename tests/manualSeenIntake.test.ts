import { describe, expect, it } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import { getManualSeenIntakeEntries } from '../src/domain/progress/manualSeenIntake';

describe('getManualSeenIntakeEntries', () => {
  it('returns only unseen entries and filters by kanji or meaning', () => {
    const [firstEntry, secondEntry, thirdEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry || !thirdEntry) {
      throw new Error('Expected canonical deck data.');
    }

    const unseenEntries = getManualSeenIntakeEntries(
      canonicalKanjiDeck.slice(0, 3),
      {
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 1,
          goodCount: 0,
          confidence: 'learning',
        },
      },
      thirdEntry.meanings[0],
    );

    expect(unseenEntries.map((entry) => entry.kanji)).toEqual([thirdEntry.kanji]);

    const kanjiMatch = getManualSeenIntakeEntries(
      canonicalKanjiDeck.slice(0, 3),
      {},
      secondEntry.kanji,
    );

    expect(kanjiMatch.map((entry) => entry.kanji)).toEqual([secondEntry.kanji]);
  });
});
