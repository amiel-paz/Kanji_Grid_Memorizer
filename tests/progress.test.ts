import { describe, expect, it } from 'vitest';
import {
  applyReviewOutcome,
  createInitialProgress,
  hasSeenProgress,
  isReviewBankCandidateProgress,
  isUnfinishedNewItemProgress,
  recordSeen,
} from '../src/domain/progress/progress';

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
      firstSeenAt: '2026-04-20T00:00:00.000Z',
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

  it('keeps the previous timestamp when a seen event omits a new one', () => {
    const learning = {
      ...createInitialProgress('力'),
      seenCount: 1,
      goodCount: 1,
      lastSeenAt: '2026-04-20T01:00:00.000Z',
      confidence: 'learning' as const,
    };

    expect(recordSeen(learning)).toMatchObject({
      seenCount: 2,
      goodCount: 1,
      lastSeenAt: '2026-04-20T01:00:00.000Z',
      confidence: 'learning',
    });
  });

  it('derives durable seen and unfinished-new carryover signals from progress', () => {
    expect(hasSeenProgress(undefined)).toBe(false);
    expect(isReviewBankCandidateProgress(undefined)).toBe(false);
    expect(isUnfinishedNewItemProgress(undefined)).toBe(false);
    expect(hasSeenProgress({ confidence: 'new' })).toBe(false);
    expect(isReviewBankCandidateProgress({ confidence: 'new' })).toBe(false);
    expect(isUnfinishedNewItemProgress({ confidence: 'new' })).toBe(false);
    expect(hasSeenProgress({ seenCount: 1, confidence: 'new' })).toBe(true);
    expect(isReviewBankCandidateProgress({ seenCount: 1, confidence: 'new' })).toBe(false);
    expect(isUnfinishedNewItemProgress({ seenCount: 1, confidence: 'new' })).toBe(true);
    expect(hasSeenProgress({ seenCount: 2, confidence: 'learning' })).toBe(true);
    expect(isReviewBankCandidateProgress({ seenCount: 2, confidence: 'learning' })).toBe(false);
    expect(isUnfinishedNewItemProgress({ seenCount: 2, confidence: 'learning' })).toBe(true);
    expect(hasSeenProgress({ seenCount: 4, confidence: 'familiar' })).toBe(true);
    expect(isReviewBankCandidateProgress({ seenCount: 4, confidence: 'familiar' })).toBe(true);
    expect(isUnfinishedNewItemProgress({ seenCount: 4, confidence: 'familiar' })).toBe(false);
    expect(
      isReviewBankCandidateProgress({
        seenCount: 4,
        confidence: 'learning',
        reviewBankCandidate: true,
      }),
    ).toBe(true);
    expect(
      isUnfinishedNewItemProgress({
        seenCount: 4,
        confidence: 'learning',
        reviewBankCandidate: true,
      }),
    ).toBe(false);
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
      firstSeenAt: '2026-04-20T00:00:00.000Z',
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
      firstSeenAt: '2026-04-20T00:05:00.000Z',
      lastSeenAt: '2026-04-20T00:05:00.000Z',
      confidence: 'learning',
    });
  });

  it('keeps the first-seen timestamp stable after later reviews', () => {
    const learning = {
      ...createInitialProgress('力'),
      seenCount: 2,
      goodCount: 1,
      firstSeenAt: '2026-04-20T00:00:00.000Z',
      lastSeenAt: '2026-04-20T01:00:00.000Z',
      confidence: 'learning' as const,
    };

    expect(
      applyReviewOutcome(learning, {
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 0.66,
        nextCueOpacity: 0.33,
        reviewedAt: '2026-04-21T00:00:00.000Z',
      }),
    ).toMatchObject({
      seenCount: 3,
      goodCount: 2,
      firstSeenAt: '2026-04-20T00:00:00.000Z',
      lastSeenAt: '2026-04-21T00:00:00.000Z',
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
      reviewBankCandidate: true,
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

  it('keeps familiar confidence on a good review that does not complete a new fade step', () => {
    const familiar = {
      ...createInitialProgress('力'),
      seenCount: 4,
      goodCount: 3,
      confidence: 'familiar' as const,
    };

    expect(
      applyReviewOutcome(familiar, {
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 0,
        nextCueOpacity: 0,
        reviewedAt: '2026-04-20T00:17:00.000Z',
      }),
    ).toMatchObject({
      seenCount: 5,
      goodCount: 4,
      lastSeenAt: '2026-04-20T00:17:00.000Z',
      confidence: 'familiar',
    });
  });

  it('drops familiar progress back to learning after an again outcome', () => {
    const familiar = {
      ...createInitialProgress('力'),
      seenCount: 4,
      goodCount: 3,
      confidence: 'familiar' as const,
      reviewBankCandidate: true,
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
      reviewBankCandidate: true,
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
