import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('heading', { name: firstEntry.kanji })).toBeInTheDocument();
    expect(screen.getByText(firstEntry.meanings.join(', '))).toBeInTheDocument();
    expect(screen.getByText('2 reviews')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `${firstEntry.kanji} cue card preview` })).toBeInTheDocument();
    const seenCard = screen.getByRole('heading', { name: firstEntry.kanji }).closest('article');
    expect(seenCard).not.toBeNull();
    expect(within(seenCard!).getByText('On readings')).toBeInTheDocument();
    expect(within(seenCard!).getByText(firstEntry.onyomi.join('、'))).toBeInTheDocument();
    expect(within(seenCard!).getByText('Kun readings')).toBeInTheDocument();
    expect(within(seenCard!).getByText(firstEntry.kunyomi.join('、'))).toBeInTheDocument();
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
    expect(screen.getByRole('img', { name: `${firstEntry.kanji} cue card preview` })).toBeInTheDocument();
    const intakeCard = screen.getByRole('heading', { name: firstEntry.kanji }).closest('article');
    expect(intakeCard).not.toBeNull();
    expect(within(intakeCard!).getByText('On readings')).toBeInTheDocument();
    expect(within(intakeCard!).getByText(firstEntry.onyomi.join('、'))).toBeInTheDocument();
    expect(within(intakeCard!).getByText('Kun readings')).toBeInTheDocument();
    expect(within(intakeCard!).getByText(firstEntry.kunyomi.join('、'))).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark encountered' })[0]!);

    expect(screen.getByText(/is now marked as encountered in durable learner progress/i)).toBeInTheDocument();
    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${firstEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Seen library' }));

    expect(screen.getByRole('heading', { name: firstEntry.kanji })).toBeInTheDocument();
    expect(screen.getByText('1 review')).toBeInTheDocument();
    const seenCard = screen.getByRole('heading', { name: firstEntry.kanji }).closest('article');
    expect(seenCard).not.toBeNull();
    expect(within(seenCard!).getByText(firstEntry.onyomi.join('、'))).toBeInTheDocument();
    expect(within(seenCard!).getByText(firstEntry.kunyomi.join('、'))).toBeInTheDocument();
  });

  it('paginates the seen library at 120 cards per page', () => {
    const pageOneEntry = canonicalKanjiDeck[0];
    const pageTwoEntry = canonicalKanjiDeck[120];

    if (!pageOneEntry || !pageTwoEntry) {
      throw new Error('Expected enough canonical deck data for pagination.');
    }

    const progressByKanji = Object.fromEntries(
      canonicalKanjiDeck.slice(0, 121).map((entry, index) => [
        entry.kanji,
        {
          kanji: entry.kanji,
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
          lastSeenAt: '2026-04-20T10:00:00.000Z',
          confidence: 'learning',
          reviewBankCandidate: index % 2 === 0,
        },
      ]),
    );

    storage.setItem('kanji-grid-progress-v0', JSON.stringify(progressByKanji));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Seen library' }));

    expect(screen.getAllByText(`Showing 1-120 of 121 seen kanji.`)).toHaveLength(2);
    expect(screen.getByRole('heading', { name: pageOneEntry.kanji })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: pageTwoEntry.kanji })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '2' })[0]!);

    expect(screen.getAllByText(`Showing 121-121 of 121 seen kanji.`)).toHaveLength(2);
    expect(screen.getByRole('heading', { name: pageTwoEntry.kanji })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: pageOneEntry.kanji })).not.toBeInTheDocument();
  });

  it('paginates manual intake and resets to page one when the filter changes', () => {
    const pageOneEntry = canonicalKanjiDeck[0];
    const pageTwoEntry = canonicalKanjiDeck[120];

    if (!pageOneEntry || !pageTwoEntry) {
      throw new Error('Expected enough canonical deck data for pagination.');
    }

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Manual intake' }));

    expect(
      screen.getAllByText(`Showing 1-120 of ${canonicalKanjiDeck.length} unseen kanji.`),
    ).toHaveLength(2);
    expect(screen.getByRole('heading', { name: pageOneEntry.kanji })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: pageTwoEntry.kanji })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '2' })[0]!);

    expect(
      screen.getAllByText(`Showing 121-240 of ${canonicalKanjiDeck.length} unseen kanji.`),
    ).toHaveLength(2);
    expect(screen.getByRole('heading', { name: pageTwoEntry.kanji })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: pageOneEntry.kanji },
    });

    expect(screen.getByRole('heading', { name: '1 matching unseen kanji' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'unseen kanji pages' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: pageOneEntry.kanji })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: pageTwoEntry.kanji })).not.toBeInTheDocument();
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
