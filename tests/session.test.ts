import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import { createSession, getCueOpacity, recordReviewGrade } from '../src/domain/session/session';

describe('session cue opacity', () => {
  it('dims the cue along the review ladder after correct answers without changing kanji data', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const firstCorrect = recordReviewGrade(session, entry.kanji, 'good');
    const secondCorrect = recordReviewGrade(firstCorrect, entry.kanji, 'good');
    const thirdCorrect = recordReviewGrade(secondCorrect, entry.kanji, 'good');
    const extraCorrect = recordReviewGrade(thirdCorrect, entry.kanji, 'good');

    expect(getCueOpacity(session, entry.kanji)).toBe(1);
    expect(getCueOpacity(firstCorrect, entry.kanji)).toBe(0.66);
    expect(getCueOpacity(secondCorrect, entry.kanji)).toBe(0.33);
    expect(getCueOpacity(thirdCorrect, entry.kanji)).toBe(0);
    expect(getCueOpacity(extraCorrect, entry.kanji)).toBe(0);
    expect(entry).not.toHaveProperty('opacity');
  });

  it('selects ten mock entries and advances after each review answer', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill);

    expect(session.selectedKanji).toHaveLength(10);
    expect(session.activeKanji).toBe(mockKanji[0]?.kanji);

    const nextSession = recordReviewGrade(session, session.activeKanji, 'good');

    expect(nextSession.activeKanji).toBe(mockKanji[1]?.kanji);
  });

  it('raises the cue one review ladder step after a miss', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const dimmedSession = recordReviewGrade(
      recordReviewGrade(session, entry.kanji, 'good'),
      entry.kanji,
      'good',
    );
    const missedSession = recordReviewGrade(dimmedSession, entry.kanji, 'again');

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
