import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import {
  advanceSessionItem,
  answerSessionReview,
  createSession,
  getCueOpacity,
  recordReviewGrade,
  selectSessionEntries,
} from '../src/domain/session/session';

function createDeterministicRandom(values: readonly number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length];

    if (value === undefined) {
      throw new Error('Expected at least one deterministic random value.');
    }

    index += 1;
    return value;
  };
}

describe('session cue opacity', () => {
  it('creates a session with a randomized 10-kanji selection, an explicit queue, and drill-based initial opacity', () => {
    const fadedRecall = getDrillById('faded-recall');
    const blindRecall = getDrillById('blind-recall');
    const selectionRandom = createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]);
    const fadedSession = createSession(mockKanji, fadedRecall, {
      id: 'faded-session',
      random: selectionRandom,
    });
    const blindSession = createSession(mockKanji, blindRecall, {
      id: 'blind-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });

    expect(fadedSession.selectedKanji).toHaveLength(10);
    expect(new Set(fadedSession.selectedKanji)).toHaveLength(10);
    expect(fadedSession.selectedKanji).toEqual(['力', '月', '人', '水', '耳', '山', '足', '川', '口', '日']);
    expect(fadedSession.queue).toEqual(fadedSession.selectedKanji);
    expect(fadedSession.activeKanji).toBe(fadedSession.queue[0]);
    expect(getCueOpacity(fadedSession, fadedSession.activeKanji)).toBe(1);
    expect(getCueOpacity(blindSession, blindSession.activeKanji)).toBe(0);
  });

  it('selects session entries deterministically without duplicates and caps the selection at the available entries', () => {
    const selected = selectSessionEntries(
      mockKanji.slice(0, 4),
      10,
      createDeterministicRandom([0.75, 0.5, 0.9, 0]),
    );

    expect(selected.map((entry) => entry.kanji)).toEqual(['水', '月', '火', '日']);
    expect(new Set(selected.map((entry) => entry.kanji))).toHaveLength(4);
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
    const session = createSession(mockKanji, drill, {
      id: 'review-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const { event, session: nextSession } = answerSessionReview(session, 'good');

    expect(session.selectedKanji).toHaveLength(10);
    expect(session.activeKanji).toBe('力');
    expect(event).toEqual({
      type: 'review-answer',
      kanji: '力',
      reviewGrade: 'good',
      previousCueOpacity: 1,
      nextCueOpacity: 0.66,
      queueBefore: session.queue,
      queueAfter: [...session.queue.slice(1), session.queue[0]!],
      nextActiveKanji: '月',
    });
    expect(nextSession.queue).toEqual(event.queueAfter);
    expect(nextSession.activeKanji).toBe('月');
  });

  it('can advance learn mode without changing cue opacity or review counts', () => {
    const drill = getDrillById('learn');
    const session = createSession(mockKanji, drill, {
      id: 'learn-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const entry = mockKanji.find((candidate) => candidate.kanji === session.activeKanji);

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const nextSession = advanceSessionItem(session);

    expect(nextSession.queue).toEqual([...session.queue.slice(1), session.queue[0]!]);
    expect(nextSession.activeKanji).toBe('月');
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
    const session = createSession(mockKanji, drill, {
      id: 'blind-review-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const entry = mockKanji.find((candidate) => candidate.kanji === session.activeKanji);

    if (!entry) {
      throw new Error('Expected active session kanji.');
    }

    const missedSession = recordReviewGrade(session, entry.kanji, 'again');
    const goodSession = recordReviewGrade(session, entry.kanji, 'good');

    expect(getCueOpacity(session, entry.kanji)).toBe(0);
    expect(getCueOpacity(missedSession, entry.kanji)).toBe(0);
    expect(getCueOpacity(goodSession, entry.kanji)).toBe(0);
  });

  it('only accepts review answers for the active kanji', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill, {
      id: 'active-only-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const nextKanji = session.queue[1];

    expect(nextKanji).toBeDefined();
    expect(() => answerSessionReview(session, 'good', nextKanji)).toThrow(
      /Only the active kanji can be advanced or answered/,
    );
  });
});
