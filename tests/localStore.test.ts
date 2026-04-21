import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from '../src/lib/localStore';

describe('createLocalStore', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
  });

  it('loads undefined when the key is missing', () => {
    const store = createLocalStore<{ value: string }>('missing-store-key');

    expect(store.load()).toBeUndefined();
  });

  it('round-trips valid JSON through localStorage', () => {
    const store = createLocalStore<{ value: string }>('round-trip-store-key');

    expect(store.save({ value: 'ok' })).toBe(true);
    expect(store.load()).toEqual({ value: 'ok' });
  });

  it('treats invalid JSON as missing data without clearing it implicitly', () => {
    storage.setItem('invalid-json-store-key', '{');
    const store = createLocalStore<{ value: string }>('invalid-json-store-key');

    expect(store.load()).toBeUndefined();
    expect(storage.getItem('invalid-json-store-key')).toBe('{');
  });

  it('returns undefined when storage is unavailable', () => {
    const store = createLocalStore<{ value: string }>('unavailable-store-key', {
      storage: () => undefined,
    });

    expect(store.load()).toBeUndefined();
    expect(store.save({ value: 'ignored' })).toBe(false);
    expect(store.clear()).toBe(false);
  });

  it('returns undefined when reading from storage throws', () => {
    const store = createLocalStore<{ value: string }>('throwing-read-store-key', {
      storage: () => createThrowingStorage({ getItem: true }),
    });

    expect(store.load()).toBeUndefined();
  });

  it('returns undefined when the parsed value fails validation', () => {
    window.localStorage.setItem('schema-mismatch-store-key', JSON.stringify({ value: 42 }));
    const store = createLocalStore<{ value: string }>('schema-mismatch-store-key', {
      validate: (value): value is { value: string } =>
        typeof value === 'object' &&
        value !== null &&
        'value' in value &&
        typeof value.value === 'string',
    });

    expect(store.load()).toBeUndefined();
  });

  it('returns false when writing to storage throws', () => {
    const store = createLocalStore<{ value: string }>('throwing-write-store-key', {
      storage: () => createThrowingStorage({ setItem: true }),
    });

    expect(store.save({ value: 'ignored' })).toBe(false);
  });

  it('returns false when clearing storage throws', () => {
    const store = createLocalStore<{ value: string }>('throwing-clear-store-key', {
      storage: () => createThrowingStorage({ removeItem: true }),
    });

    expect(store.clear()).toBe(false);
  });
});

function createThrowingStorage(options: {
  readonly getItem?: boolean;
  readonly setItem?: boolean;
  readonly removeItem?: boolean;
}): Storage {
  return {
    length: 0,
    clear() {},
    getItem() {
      if (options.getItem) {
        throw new Error('getItem failed');
      }

      return null;
    },
    key() {
      return null;
    },
    removeItem() {
      if (options.removeItem) {
        throw new Error('removeItem failed');
      }
    },
    setItem() {
      if (options.setItem) {
        throw new Error('setItem failed');
      }
    },
  };
}

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
