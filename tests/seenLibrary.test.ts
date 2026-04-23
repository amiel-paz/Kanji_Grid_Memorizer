import { describe, expect, it } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import { getSeenLibraryItems } from '../src/domain/progress/seenLibrary';

describe('getSeenLibraryItems', () => {
  it('returns only durable seen entries and sorts by most recent progress first', () => {
    const [firstEntry, secondEntry, thirdEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry || !thirdEntry) {
      throw new Error('Expected canonical deck data.');
    }

    const items = getSeenLibraryItems(canonicalKanjiDeck.slice(0, 3), {
      [firstEntry.kanji]: {
        kanji: firstEntry.kanji,
        seenCount: 2,
        goodCount: 1,
        firstSeenAt: '2026-04-20T10:00:00.000Z',
        lastSeenAt: '2026-04-20T10:00:00.000Z',
        confidence: 'learning',
      },
      [secondEntry.kanji]: {
        kanji: secondEntry.kanji,
        seenCount: 5,
        goodCount: 4,
        firstSeenAt: '2026-04-19T10:00:00.000Z',
        lastSeenAt: '2026-04-21T10:00:00.000Z',
        confidence: 'familiar',
        reviewBankCandidate: true,
      },
      存在しない: {
        kanji: '存在しない',
        seenCount: 1,
        goodCount: 1,
        firstSeenAt: '2026-04-22T10:00:00.000Z',
        lastSeenAt: '2026-04-22T10:00:00.000Z',
        confidence: 'learning',
      },
    });

    expect(items.map((item) => item.entry.kanji)).toEqual([
      secondEntry.kanji,
      firstEntry.kanji,
    ]);
    expect(items.find((item) => item.entry.kanji === thirdEntry.kanji)).toBeUndefined();
  });
});
