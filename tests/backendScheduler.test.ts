import { describe, expect, it } from 'vitest';
import {
  applyReviewOutcomes,
  createEmptyLearnerSchedulerState,
  createSchedulerPlan,
} from '../server/src/domain/scheduler';

describe('backend scheduler domain', () => {
  it('creates a first due record after a good review', () => {
    const initialState = createEmptyLearnerSchedulerState('learner-1', '2026-04-24T10:00:00.000Z');
    const nextState = applyReviewOutcomes(
      initialState,
      [
        {
          kanji: '力',
          reviewGrade: 'good',
          reviewedAt: '2026-04-24T10:00:00.000Z',
        },
      ],
      '2026-04-24T10:00:00.000Z',
    );

    expect(nextState.recordsByKanji['力']).toEqual({
      kanji: '力',
      status: 'learning',
      successCount: 1,
      lapseCount: 0,
      intervalDays: 1,
      dueAt: '2026-04-25T10:00:00.000Z',
      lastReviewedAt: '2026-04-24T10:00:00.000Z',
      lastGrade: 'good',
    });
  });

  it('moves repeated successful reviews into longer due intervals and review status', () => {
    const initialState = createEmptyLearnerSchedulerState('learner-1', '2026-04-24T10:00:00.000Z');
    const nextState = applyReviewOutcomes(
      initialState,
      [
        { kanji: '力', reviewGrade: 'good', reviewedAt: '2026-04-24T10:00:00.000Z' },
        { kanji: '力', reviewGrade: 'good', reviewedAt: '2026-04-25T10:00:00.000Z' },
        { kanji: '力', reviewGrade: 'good', reviewedAt: '2026-04-28T10:00:00.000Z' },
      ],
      '2026-04-28T10:00:00.000Z',
    );

    expect(nextState.recordsByKanji['力']).toMatchObject({
      status: 'review',
      successCount: 3,
      intervalDays: 7,
      dueAt: '2026-05-05T10:00:00.000Z',
    });
  });

  it('turns an again into a shorter relearning interval and returns due items in order', () => {
    const seededState = applyReviewOutcomes(
      createEmptyLearnerSchedulerState('learner-1', '2026-04-24T10:00:00.000Z'),
      [
        { kanji: '力', reviewGrade: 'good', reviewedAt: '2026-04-20T10:00:00.000Z' },
        { kanji: '水', reviewGrade: 'good', reviewedAt: '2026-04-18T10:00:00.000Z' },
        { kanji: '水', reviewGrade: 'good', reviewedAt: '2026-04-19T10:00:00.000Z' },
        { kanji: '水', reviewGrade: 'good', reviewedAt: '2026-04-22T10:00:00.000Z' },
        { kanji: '水', reviewGrade: 'again', reviewedAt: '2026-04-24T10:00:00.000Z' },
      ],
      '2026-04-24T10:00:00.000Z',
    );

    const plan = createSchedulerPlan(seededState, {
      asOf: '2026-04-25T12:00:00.000Z',
      limit: 10,
    });

    expect(seededState.recordsByKanji['水']).toMatchObject({
      status: 'learning',
      lapseCount: 1,
      intervalDays: 1,
      dueAt: '2026-04-25T10:00:00.000Z',
    });
    expect(plan.dueKanji).toEqual(['力', '水']);
    expect(plan.upcomingKanji).toEqual([]);
    expect(plan.remainingDueCount).toBe(0);
  });
});
