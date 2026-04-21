import { beforeEach, describe, expect, it } from 'vitest';
import { progressStore } from '../src/state/progressStore';

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
