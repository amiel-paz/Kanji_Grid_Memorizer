import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import {
  DEFAULT_DAILY_NEW_KANJI_LIMIT,
  advanceSessionItem,
  answerSessionReview,
  createSession,
  getCueOpacity,
  recordReviewGrade,
  selectSessionEntries,
} from '../src/domain/session/session';
import type { SessionState } from '../src/domain/session/types';

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
  it('rejects creating a session when no entries are available', () => {
    expect(() => createSession([], getDrillById('learn'))).toThrow(
      'Cannot create a study session without kanji entries.',
    );
  });

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

    expect(fadedSession.selectedKanji).toHaveLength(DEFAULT_DAILY_NEW_KANJI_LIMIT);
    expect(new Set(fadedSession.selectedKanji)).toHaveLength(DEFAULT_DAILY_NEW_KANJI_LIMIT);
    expect(fadedSession.selectedKanji).toEqual(['力', '月', '人', '水', '耳']);
    expect(fadedSession.queue).toEqual(fadedSession.selectedKanji);
    expect(fadedSession.activeKanji).toBe(fadedSession.queue[0]);
    expect(getCueOpacity(fadedSession, fadedSession.activeKanji ?? '')).toBe(1);
    expect(getCueOpacity(blindSession, blindSession.activeKanji ?? '')).toBe(0);
  });

  it('seeds faded-recall starting cue support from saved progress confidence while leaving live run counts fresh', () => {
    const drill = getDrillById('faded-recall');
    const [newEntry, learningEntry, familiarEntry] = mockKanji;

    if (!newEntry || !learningEntry || !familiarEntry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([newEntry, learningEntry, familiarEntry], drill, {
      id: 'seeded-session',
      random: createDeterministicRandom([0, 0, 0]),
      seedProgressByKanji: {
        [learningEntry.kanji]: {
          kanji: learningEntry.kanji,
          confidence: 'learning',
        },
        [familiarEntry.kanji]: {
          kanji: familiarEntry.kanji,
          confidence: 'familiar',
        },
      },
    });

    expect(session.selectedKanji).toEqual([learningEntry.kanji, newEntry.kanji, familiarEntry.kanji]);
    expect(session.itemStateByKanji[newEntry.kanji]).toMatchObject({
      attempts: 0,
      goodCount: 0,
      againCount: 0,
      cueOpacity: 1,
    });
    expect(session.itemStateByKanji[learningEntry.kanji]).toMatchObject({
      attempts: 0,
      goodCount: 0,
      againCount: 0,
      cueOpacity: 0.66,
    });
    expect(session.itemStateByKanji[familiarEntry.kanji]).toMatchObject({
      attempts: 0,
      goodCount: 0,
      againCount: 0,
      cueOpacity: 0.33,
    });
  });

  it('keeps learn and blind-recall starting cue policies explicit even when saved progress exists', () => {
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const seedProgressByKanji = {
      [entry.kanji]: {
        kanji: entry.kanji,
        confidence: 'familiar' as const,
      },
    };

    const learnSession = createSession([entry], getDrillById('learn'), {
      seedProgressByKanji,
    });
    const blindSession = createSession([entry], getDrillById('blind-recall'), {
      seedProgressByKanji,
    });

    expect(getCueOpacity(learnSession, entry.kanji)).toBe(1);
    expect(getCueOpacity(blindSession, entry.kanji)).toBe(0);
  });

  it('selects session entries deterministically without duplicates and caps the selection at the available entries', () => {
    const selected = selectSessionEntries(
      mockKanji.slice(0, 4),
      10,
      {
        random: createDeterministicRandom([0.75, 0.5, 0.9, 0]),
      },
    );

    expect(selected.map((entry) => entry.kanji)).toEqual(['水', '月', '火', '日']);
    expect(new Set(selected.map((entry) => entry.kanji))).toHaveLength(4);
  });

  it('re-offers unfinished carryover items before admitting replacement truly new kanji', () => {
    const entries = mockKanji.slice(0, 6);
    const selected = selectSessionEntries(entries, 6, {
      createdAt: '2026-04-21T12:00:00.000Z',
      dailyNewLimit: 2,
      progressByKanji: {
        [entries[0]!.kanji]: {
          kanji: entries[0]!.kanji,
          confidence: 'learning',
          seenCount: 2,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
        },
        [entries[1]!.kanji]: {
          kanji: entries[1]!.kanji,
          confidence: 'familiar',
          seenCount: 4,
          firstSeenAt: '2026-04-19T10:00:00.000Z',
        },
        [entries[2]!.kanji]: {
          kanji: entries[2]!.kanji,
          confidence: 'learning',
          seenCount: 1,
          firstSeenAt: '2026-04-21T08:00:00.000Z',
        },
      },
      random: createDeterministicRandom([0, 0, 0, 0, 0]),
    });

    expect(selected.map((entry) => entry.kanji)).toEqual([
      entries[0]!.kanji,
      entries[2]!.kanji,
      entries[1]!.kanji,
    ]);
  });

  it('does not double-count same-day carryover against the fresh-new allowance', () => {
    const entries = mockKanji.slice(0, 4);
    const selected = selectSessionEntries(entries, 4, {
      createdAt: '2026-04-21T12:00:00.000Z',
      dailyNewLimit: 2,
      progressByKanji: {
        [entries[0]!.kanji]: {
          kanji: entries[0]!.kanji,
          confidence: 'learning',
          seenCount: 1,
          firstSeenAt: '2026-04-21T08:00:00.000Z',
        },
      },
      random: createDeterministicRandom([0, 0, 0]),
    });

    expect(selected.map((entry) => entry.kanji)).toEqual([
      entries[0]!.kanji,
      entries[1]!.kanji,
    ]);
  });

  it('returns a smaller session batch when the daily new allowance is exhausted and there is no backfill yet', () => {
    const selected = selectSessionEntries(mockKanji.slice(0, 4), 4, {
      createdAt: '2026-04-21T12:00:00.000Z',
      dailyNewLimit: 0,
      random: createDeterministicRandom([0]),
    });

    expect(selected).toEqual([]);
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

    expect(getCueOpacity(session, entry.kanji)).toBe(1);
    expect(getCueOpacity(firstCorrect, entry.kanji)).toBe(0.66);
    expect(getCueOpacity(secondCorrect, entry.kanji)).toBe(0.33);
    expect(getCueOpacity(thirdCorrect, entry.kanji)).toBe(0);
    expect(entry).not.toHaveProperty('opacity');
  });

  it('returns an explicit review-answer event and requeues a good review later in the batch', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill, {
      id: 'review-session',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const { event, session: nextSession } = answerSessionReview(
      session,
      'good',
      session.activeKanji ?? '',
      createDeterministicRandom([0.9]),
    );

    expect(session.selectedKanji).toHaveLength(DEFAULT_DAILY_NEW_KANJI_LIMIT);
    expect(session.selectedKanji).toEqual(['力', '月', '人', '水', '耳']);
    expect(session.activeKanji).toBe('力');
    expect(event).toEqual({
      type: 'review-answer',
      kanji: '力',
      reviewGrade: 'good',
      previousCueOpacity: 1,
      nextCueOpacity: 0.66,
      queueBefore: session.queue,
      queueAfter: ['月', '人', '水', '耳', '力'],
      nextActiveKanji: '月',
    });
    expect(nextSession.queue).toEqual(event.queueAfter);
    expect(nextSession.activeKanji).toBe('月');
  });

  it('keeps the selected session deck stable while queue order and per-run item state stay session-owned', () => {
    const drill = getDrillById('faded-recall');
    const session = createSession(mockKanji, drill, {
      id: 'session-owned-state',
      random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
    });
    const answeredKanji = session.activeKanji ?? '';
    const nextKanji = session.queue[1];
    const { session: nextSession } = answerSessionReview(
      session,
      'good',
      session.activeKanji ?? '',
      createDeterministicRandom([0.9]),
    );

    expect(nextKanji).toBeDefined();
    expect(nextSession.selectedKanji).toEqual(session.selectedKanji);
    expect(nextSession.queue).toEqual(['月', '人', '水', '耳', '力']);
    expect(nextSession.activeKanji).toBe(nextKanji);
    expect(nextSession.itemStateByKanji[answeredKanji]).toMatchObject({
      attempts: 1,
      goodCount: 1,
      againCount: 0,
      cueOpacity: 0.66,
    });
    expect(nextSession.itemStateByKanji[nextKanji!]).toMatchObject({
      attempts: 0,
      goodCount: 0,
      againCount: 0,
      cueOpacity: 1,
    });
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
    expect(nextSession.itemStateByKanji[entry.kanji]?.againCount).toBe(0);
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

  it('keeps full-cue drills at 100% even if a review grade is recorded', () => {
    const drill = getDrillById('learn');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([entry], drill);
    const reviewedSession = recordReviewGrade(session, entry.kanji, 'good');

    expect(getCueOpacity(reviewedSession, entry.kanji)).toBe(1);
    expect(reviewedSession.itemStateByKanji[entry.kanji]).toMatchObject({
      attempts: 1,
      goodCount: 1,
      againCount: 0,
    });
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

  it('repeats missed cards sooner as again pressure builds', () => {
    const sessionWithFirstMiss = createReviewSession({
      activeKanji: 'A',
      queue: ['A', 'B', 'C', 'D', 'E'],
      againCount: 0,
      cueOpacity: 0.66,
    });
    const sessionWithRepeatedMiss = createReviewSession({
      activeKanji: 'A',
      queue: ['A', 'B', 'C', 'D', 'E'],
      againCount: 2,
      cueOpacity: 0.66,
    });
    const firstMiss = answerSessionReview(sessionWithFirstMiss, 'again', 'A', () => 0.99);
    const repeatedMiss = answerSessionReview(sessionWithRepeatedMiss, 'again', 'A', () => 0.99);

    expect(firstMiss.event.queueAfter).toEqual(['B', 'C', 'D', 'A', 'E']);
    expect(repeatedMiss.event.queueAfter).toEqual(['B', 'A', 'C', 'D', 'E']);
    expect(firstMiss.session.itemStateByKanji['A']).toMatchObject({ againCount: 1, cueOpacity: 1 });
    expect(repeatedMiss.session.itemStateByKanji['A']).toMatchObject({ againCount: 3, cueOpacity: 1 });
  });

  it('retires a card after a successful zero-cue pass in faded recall', () => {
    const drill = getDrillById('faded-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([entry], drill);
    const atZeroCue = recordReviewGrade(
      recordReviewGrade(recordReviewGrade(session, entry.kanji, 'good'), entry.kanji, 'good'),
      entry.kanji,
      'good',
    );
    const retired = answerSessionReview(atZeroCue, 'good', entry.kanji);

    expect(getCueOpacity(atZeroCue, entry.kanji)).toBe(0);
    expect(retired.event.queueAfter).toEqual([]);
    expect(retired.event.nextActiveKanji).toBeNull();
    expect(retired.session.queue).toEqual([]);
    expect(retired.session.activeKanji).toBeNull();
  });

  it('retires blind-recall cards after a successful pass because they start at zero cue', () => {
    const drill = getDrillById('blind-recall');
    const entry = mockKanji[0];

    if (!entry) {
      throw new Error('Expected mock kanji data.');
    }

    const session = createSession([entry], drill);
    const retired = answerSessionReview(session, 'good', entry.kanji);

    expect(retired.event.queueAfter).toEqual([]);
    expect(retired.event.nextActiveKanji).toBeNull();
    expect(retired.session.activeKanji).toBeNull();
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

  it('rejects cue lookups for kanji outside the current session', () => {
    const session = createSession(mockKanji.slice(0, 2), getDrillById('faded-recall'));

    expect(() => getCueOpacity(session, '力')).toThrow('Kanji is not part of this session: 力');
  });
});

function createReviewSession({
  activeKanji,
  againCount,
  cueOpacity,
  queue,
}: {
  activeKanji: string;
  againCount: number;
  cueOpacity: 1 | 0.66 | 0.33 | 0;
  queue: readonly string[];
}): SessionState {
  return {
    id: 'review-test-session',
    drillConfigId: 'faded-recall',
    selectedKanji: queue,
    queue,
    activeKanji,
    itemStateByKanji: Object.fromEntries(
      queue.map((kanji) => [
        kanji,
        {
          kanji,
          attempts: kanji === activeKanji ? againCount : 0,
          goodCount: 0,
          againCount: kanji === activeKanji ? againCount : 0,
          cueOpacity: kanji === activeKanji ? cueOpacity : 1,
        },
      ]),
    ),
  };
}
