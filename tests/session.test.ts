import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import {
  advanceSessionItem,
  answerSessionReview,
  createSession,
  getCueOpacity,
  recordReviewGrade,
} from '../src/domain/session/session';

describe('session cue opacity', () => {
  it('creates a session with selected kanji, an explicit queue, and drill-based initial opacity', () => {
    const fadedRecall = getDrillById('faded-recall');
    const blindRecall = getDrillById('blind-recall');
    const fadedSession = createSession(mockKanji, fadedRecall);
    const blindSession = createSession(mockKanji, blindRecall);

    expect(fadedSession.selectedKanji).toHaveLength(10);
    expect(fadedSession.queue).toEqual(fadedSession.selectedKanji);
    expect(fadedSession.activeKanji).toBe(fadedSession.queue[0]);
    expect(getCueOpacity(fadedSession, fadedSession.activeKanji)).toBe(1);
    expect(getCueOpacity(blindSession, blindSession.activeKanji)).toBe(0);
  });

  it('dims the cue along the review ladder after correct answers without changing kanji data', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([entry], drill);
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

  it('returns an explicit review-answer event and advances the queue after grading', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill);
    const { event, session: nextSession } = answerSessionReview(session, 'good');

    expect(session.selectedKanji).toHaveLength(10);
    expect(session.activeKanji).toBe(mockKanji[0]?.kanji);
    expect(event).toEqual({
      type: 'review-answer',
      kanji: mockKanji[0]?.kanji,
      reviewGrade: 'good',
      previousCueOpacity: 1,
      nextCueOpacity: 0.66,
      queueBefore: session.queue,
      queueAfter: [...session.queue.slice(1), session.queue[0]!],
      nextActiveKanji: mockKanji[1]?.kanji,
    });
    expect(nextSession.queue).toEqual(event.queueAfter);
    expect(nextSession.activeKanji).toBe(mockKanji[1]?.kanji);
  });

  it('can advance learn mode without changing cue opacity or review counts', () => {
    const drill = getDrillById('learn');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const nextSession = advanceSessionItem(session);

    expect(nextSession.queue).toEqual([...session.queue.slice(1), session.queue[0]!]);
    expect(nextSession.activeKanji).toBe(mockKanji[1]?.kanji);
    expect(getCueOpacity(nextSession, entry.kanji)).toBe(1);
    expect(nextSession.itemStateByKanji[entry.kanji]?.attempts).toBe(0);
    expect(nextSession.itemStateByKanji[entry.kanji]?.goodCount).toBe(0);
  });

  it('raises the cue one review ladder step after a miss', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([entry], drill);
    const dimmedSession = recordReviewGrade(
      recordReviewGrade(session, entry.kanji, 'good'),
      entry.kanji,
      'good',
    );
    const missedSession = recordReviewGrade(dimmedSession, entry.kanji, 'again');

    expect(getCueOpacity(dimmedSession, entry.kanji)).toBe(0.33);
    expect(getCueOpacity(missedSession, entry.kanji)).toBe(0.66);
  });

  it('keeps blind recall cues hidden throughout review grading', () => {
    const drill = getDrillById('blind-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession(mockKanji, drill);
    const missedSession = recordReviewGrade(session, entry.kanji, 'again');
    const goodSession = recordReviewGrade(session, entry.kanji, 'good');

    expect(getCueOpacity(session, entry.kanji)).toBe(0);
    expect(getCueOpacity(missedSession, entry.kanji)).toBe(0);
    expect(getCueOpacity(goodSession, entry.kanji)).toBe(0);
  });

  it('only accepts review answers for the active kanji', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill);
    const nextKanji = session.queue[1];

    expect(nextKanji).toBeDefined();
    expect(() => answerSessionReview(session, 'good', nextKanji)).toThrow(
      /Only the active kanji can be advanced or answered/,
    );
  });
});
