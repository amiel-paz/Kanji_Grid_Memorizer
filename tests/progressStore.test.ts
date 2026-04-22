import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyReviewEventToProgressRecords,
  loadProgressRecords,
  persistReviewEventToProgressStore,
  progressStore,
} from '../src/state/progressStore';

describe('progressStore', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('loads saved progress records that match the runtime contract', () => {
    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        力: {
          kanji: '力',
          seenCount: 1,
          goodCount: 1,
          lastSeenAt: '2026-04-20T00:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    expect(progressStore.load()).toEqual({
      力: {
        kanji: '力',
        seenCount: 1,
        goodCount: 1,
        lastSeenAt: '2026-04-20T00:00:00.000Z',
        confidence: 'learning',
      },
    });
  });

  it('ignores saved progress records with a schema mismatch', () => {
    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        力: {
          kanji: '月',
          seenCount: 1,
          goodCount: 1,
          confidence: 'learning',
        },
      }),
    );

    expect(progressStore.load()).toBeUndefined();
  });

  it('loads an empty progress record set when the store is missing or invalid', () => {
    expect(loadProgressRecords()).toEqual({});

    storage.setItem('kanji-grid-progress-v0', '{');

    expect(loadProgressRecords()).toEqual({});
  });

  it('applies a review event through the progress helpers without ad hoc mutation', () => {
    expect(
      applyReviewEventToProgressRecords(
        {
          力: {
            kanji: '力',
            seenCount: 1,
            goodCount: 0,
            confidence: 'learning',
          },
        },
        {
          type: 'review-answer',
          kanji: '力',
          reviewGrade: 'good',
          previousCueOpacity: 0.33,
          nextCueOpacity: 0,
          queueBefore: ['力'],
          queueAfter: ['力'],
          nextActiveKanji: '力',
        },
        '2026-04-21T12:00:00.000Z',
      ),
    ).toEqual({
      力: {
        kanji: '力',
        seenCount: 2,
        goodCount: 1,
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'familiar',
      },
    });
  });

  it('persists the next progress record set after an explicit review event', () => {
    const nextProgress = persistReviewEventToProgressStore(
      loadProgressRecords(),
      {
        type: 'review-answer',
        kanji: '力',
        reviewGrade: 'again',
        previousCueOpacity: 1,
        nextCueOpacity: 0.66,
        queueBefore: ['力', '月'],
        queueAfter: ['月', '力'],
        nextActiveKanji: '月',
      },
      '2026-04-21T12:05:00.000Z',
    );

    expect(nextProgress).toEqual({
      力: {
        kanji: '力',
        seenCount: 1,
        goodCount: 0,
        lastSeenAt: '2026-04-21T12:05:00.000Z',
        confidence: 'learning',
      },
    });
    expect(progressStore.load()).toEqual(nextProgress);
  });

  it('updates only the reviewed kanji and keeps persistence scoped to the small learner record', () => {
    const nextProgress = persistReviewEventToProgressStore(
      {
        月: {
          kanji: '月',
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      },
      {
        type: 'review-answer',
        kanji: '力',
        reviewGrade: 'good',
        previousCueOpacity: 0.33,
        nextCueOpacity: 0,
        queueBefore: ['力', '月'],
        queueAfter: ['月', '力'],
        nextActiveKanji: '月',
      },
      '2026-04-21T12:10:00.000Z',
    );
    const reviewedProgress = nextProgress['力'];

    expect(nextProgress).toEqual({
      月: {
        kanji: '月',
        seenCount: 2,
        goodCount: 1,
        lastSeenAt: '2026-04-20T12:00:00.000Z',
        confidence: 'learning',
      },
      力: {
        kanji: '力',
        seenCount: 1,
        goodCount: 1,
        lastSeenAt: '2026-04-21T12:10:00.000Z',
        confidence: 'familiar',
      },
    });
    expect(reviewedProgress).toBeDefined();
    expect(Object.keys(reviewedProgress ?? {}).sort()).toEqual([
      'confidence',
      'goodCount',
      'kanji',
      'lastSeenAt',
      'seenCount',
    ]);
    expect(storage.length).toBe(1);
    expect(storage.key(0)).toBe('kanji-grid-progress-v0');
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}
