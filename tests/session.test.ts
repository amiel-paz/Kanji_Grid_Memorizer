import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import { createSession, getCueOpacity, recordAnswer } from '../src/domain/session/session';

describe('session cue opacity', () => {
  it('dims the cue along the review ladder after correct answers without changing kanji data', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const firstCorrect = recordAnswer(session, entry.kanji, true);
    const secondCorrect = recordAnswer(firstCorrect, entry.kanji, true);
    const thirdCorrect = recordAnswer(secondCorrect, entry.kanji, true);
    const extraCorrect = recordAnswer(thirdCorrect, entry.kanji, true);

    expect(getCueOpacity(session, entry.kanji)).toBe(1);
    expect(getCueOpacity(firstCorrect, entry.kanji)).toBe(0.66);
    expect(getCueOpacity(secondCorrect, entry.kanji)).toBe(0.33);
    expect(getCueOpacity(thirdCorrect, entry.kanji)).toBe(0);
    expect(getCueOpacity(extraCorrect, entry.kanji)).toBe(0);
    expect(entry).not.toHaveProperty('opacity');
  });

  it('raises the cue one review ladder step after a miss', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const dimmedSession = recordAnswer(recordAnswer(session, entry.kanji, true), entry.kanji, true);
    const missedSession = recordAnswer(dimmedSession, entry.kanji, false);

    expect(getCueOpacity(dimmedSession, entry.kanji)).toBe(0.33);
    expect(getCueOpacity(missedSession, entry.kanji)).toBe(0.66);
  });

  it('keeps blind recall cues hidden at session start', () => {
    const drill = getDrillById('blind-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);

    expect(getCueOpacity(session, entry.kanji)).toBe(0);
  });
});
