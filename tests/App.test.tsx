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
    expect(screen.getByText(/you can also use manual intake for outside encounters/i)).toBeInTheDocument();
  });

  it('lets the learner mark an outside encounter and then see it in the library', () => {
    const firstEntry = canonicalKanjiDeck[0];

    if (!firstEntry) {
      throw new Error('Expected canonical deck data.');
    }

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Manual intake' }));

    expect(screen.getByRole('heading', { name: 'Mark an outside encounter as seen' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark encountered' })[0]!);

    expect(screen.getByText(/is now marked as encountered in durable learner progress/i)).toBeInTheDocument();
    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${firstEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Seen library' }));

    expect(screen.getByText(firstEntry.kanji)).toBeInTheDocument();
    expect(screen.getByText('1 review')).toBeInTheDocument();
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
