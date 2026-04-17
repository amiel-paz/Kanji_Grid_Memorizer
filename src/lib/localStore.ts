export interface LocalStore<T> {
  load(): T | undefined;
  save(value: T): void;
  clear(): void;
}

export function createLocalStore<T>(key: string): LocalStore<T> {
  return {
    load() {
      const raw = window.localStorage.getItem(key);

      if (!raw) {
        return undefined;
      }

      return JSON.parse(raw) as T;
    },
    save(value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    clear() {
      window.localStorage.removeItem(key);
    },
  };
}

// TODO: Add validation/migration before storing meaningful progress data.
