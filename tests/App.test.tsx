import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import { App } from '../src/app/App';

describe('App', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the study view and can switch to the seen library', () => {
    const firstEntry = canonicalKanjiDeck[0];

    if (!firstEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 2,
          goodCount: 1,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
          lastSeenAt: '2026-04-21T09:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(<App />);

    expect(screen.getByRole('heading', { name: 'A small local kanji loop that stays honest' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Seen library' }));

    expect(screen.getByRole('heading', { name: "Kanji you've already encountered" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seen library' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(firstEntry.kanji)).toBeInTheDocument();
    expect(screen.getByText(firstEntry.meanings.join(', '))).toBeInTheDocument();
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
  });

  it('shows an honest empty state when durable progress has not seen any kanji yet', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Seen library' }));

    expect(screen.getByRole('heading', { name: 'Your learner library is still empty' })).toBeInTheDocument();
    expect(screen.getByText(/manual intake for outside encounters is a later planned worktree/i)).toBeInTheDocument();
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
