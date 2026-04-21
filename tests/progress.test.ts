import { describe, expect, it } from 'vitest';
import { applyReviewOutcome, createInitialProgress, recordSeen } from '../src/domain/progress/progress';

describe('progress helpers', () => {
  it('creates an explicit empty progress record for a kanji', () => {
    expect(createInitialProgress('力')).toEqual({
      kanji: '力',
      seenCount: 0,
      goodCount: 0,
      confidence: 'new',
    });
  });

  it('records a seen event without changing review success counts', () => {
    const initial = createInitialProgress('力');

    expect(recordSeen(initial, '2026-04-20T00:00:00.000Z')).toEqual({
      kanji: '力',
      seenCount: 1,
      goodCount: 0,
      lastSeenAt: '2026-04-20T00:00:00.000Z',
      confidence: 'learning',
    });
  });

  it('preserves familiar confidence when an already-familiar item is merely seen again', () => {
    const familiar = {
      ...createInitialProgress('力'),
      seenCount: 4,
      goodCount: 3,
      confidence: 'familiar' as const,
    };

    expect(recordSeen(familiar, '2026-04-20T01:00:00.000Z')).toMatchObject({
      seenCount: 5,
      goodCount: 3,
      lastSeenAt: '2026-04-20T01:00:00.000Z',
      confidence: 'familiar',
    });
  });

  it('counts every review as seen and increments goodCount only for good answers', () => {
    const initial = createInitialProgress('力');

    expect(
      applyReviewOutcome(initial, {
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 1,
        nextCueOpacity: 0.66,
        reviewedAt: '2026-04-20T00:00:00.000Z',
      }),
    ).toEqual({
      kanji: '力',
      seenCount: 1,
      goodCount: 1,
      lastSeenAt: '2026-04-20T00:00:00.000Z',
      confidence: 'learning',
    });

    expect(
      applyReviewOutcome(initial, {
        kanji: '力',
        reviewGrade: 'again',
        previousCueOpacity: 0.66,
        nextCueOpacity: 1,
        reviewedAt: '2026-04-20T00:05:00.000Z',
      }),
    ).toEqual({
      kanji: '力',
      seenCount: 1,
      goodCount: 0,
      lastSeenAt: '2026-04-20T00:05:00.000Z',
      confidence: 'learning',
    });
  });

  it('marks progress familiar only when a good answer completes the fade ladder onto 0%', () => {
    const learning = {
      ...createInitialProgress('力'),
      seenCount: 3,
      goodCount: 2,
      confidence: 'learning' as const,
    };

    expect(
      applyReviewOutcome(learning, {
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 0.33,
        nextCueOpacity: 0,
        reviewedAt: '2026-04-20T00:10:00.000Z',
      }),
    ).toMatchObject({
      seenCount: 4,
      goodCount: 3,
      confidence: 'familiar',
    });
  });

  it('does not mark blind-recall successes as familiar when no fade step was completed', () => {
    const learning = {
      ...createInitialProgress('力'),
      seenCount: 1,
      goodCount: 0,
      confidence: 'learning' as const,
    };

    expect(
      applyReviewOutcome(learning, {
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 0,
        nextCueOpacity: 0,
        reviewedAt: '2026-04-20T00:15:00.000Z',
      }),
    ).toMatchObject({
      seenCount: 2,
      goodCount: 1,
      confidence: 'learning',
    });
  });

  it('drops familiar progress back to learning after an again outcome', () => {
    const familiar = {
      ...createInitialProgress('力'),
      seenCount: 4,
      goodCount: 3,
      confidence: 'familiar' as const,
    };

    expect(
      applyReviewOutcome(familiar, {
        kanji: '力',
        reviewGrade: 'again',
        previousCueOpacity: 0,
        nextCueOpacity: 0.33,
        reviewedAt: '2026-04-20T00:20:00.000Z',
      }),
    ).toMatchObject({
      seenCount: 5,
      goodCount: 3,
      confidence: 'learning',
    });
  });

  it('rejects review outcomes for a different kanji', () => {
    expect(() =>
      applyReviewOutcome(createInitialProgress('力'), {
        kanji: '月',
        reviewGrade: 'good',
        previousCueOpacity: 1,
        nextCueOpacity: 0.66,
      }),
    ).toThrow(/Progress update kanji mismatch/);
  });
});
