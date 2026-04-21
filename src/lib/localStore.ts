export interface LocalStore<T> {
  load(): T | undefined;
  save(value: T): boolean;
  clear(): boolean;
}

export interface CreateLocalStoreOptions<T> {
  readonly storage?: () => Storage | undefined;
  readonly validate?: (value: unknown) => value is T;
}

export function createLocalStore<T>(
  key: string,
  options: CreateLocalStoreOptions<T> = {},
): LocalStore<T> {
  const getStorage = options.storage ?? getBrowserLocalStorage;

  return {
    load(): T | undefined {
      const storage = getStorage();

      if (!storage) {
        return undefined;
      }

      const raw = safeGetItem(storage, key);

      if (!raw) {
        return undefined;
      }

      const parsed = safeParse(raw);

      if (parsed === undefined) {
        return undefined;
      }

      if (options.validate && !options.validate(parsed)) {
        return undefined;
      }

      return parsed as T;
    },
    save(value) {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      const storage = getStorage();

      if (!storage) {
        return false;
      }

      try {
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

function getBrowserLocalStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
