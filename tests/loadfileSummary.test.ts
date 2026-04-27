import { describe, expect, it } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import { summarizeLoadfileProgress } from '../src/domain/progress/loadfileSummary';

describe('summarizeLoadfileProgress', () => {
  it('counts seen and unseen kanji from durable learner progress', () => {
    const [firstEntry, secondEntry, thirdEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry || !thirdEntry) {
      throw new Error('Expected canonical deck entries.');
    }

    const summary = summarizeLoadfileProgress(canonicalKanjiDeck, {
      [firstEntry.kanji]: {
        kanji: firstEntry.kanji,
        seenCount: 1,
        goodCount: 0,
        confidence: 'learning',
      },
      [secondEntry.kanji]: {
        kanji: secondEntry.kanji,
        seenCount: 0,
        goodCount: 1,
        confidence: 'familiar',
      },
      [thirdEntry.kanji]: {
        kanji: thirdEntry.kanji,
        seenCount: 0,
        goodCount: 0,
        confidence: 'new',
      },
    });

    expect(summary).toEqual({
      seenKanjiCount: 2,
      unseenKanjiCount: canonicalKanjiDeck.length - 2,
      totalKanjiCount: canonicalKanjiDeck.length,
    });
  });
});
