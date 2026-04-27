import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import type { ReviewSchedulerClient } from '../src/domain/reviewScheduler/client';
import { App } from '../src/app/App';

describe('App', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: vi.fn(() => true),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', '/');
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

  it('shows the runner loadfile screen with current seen and unseen counts before study starts', () => {
    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
          lastSeenAt: '2026-04-20T10:00:00.000Z',
          confidence: 'learning',
        },
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 0,
          goodCount: 1,
          confidence: 'familiar',
        },
      }),
    );
    window.history.replaceState({}, '', '/?loadfile=1');

    render(
      <App
        loadfileSchedulerBaseUrl="http://127.0.0.1:8787"
        reviewSchedulerClient={createStubReviewSchedulerClient()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Loadfile ready' })).toBeInTheDocument();
    const loadfileCard = screen
      .getByRole('heading', { name: 'Loadfile 1' })
      .closest('article')
      ?.querySelector('button.loadfile-bar') as HTMLElement | null;
    expect(loadfileCard).not.toBeNull();
    expect(within(loadfileCard!).getByText('127.0.0.1:8787')).toBeInTheDocument();
    expect(within(loadfileCard!).getByText('local-learner')).toBeInTheDocument();
    expect(within(loadfileCard!).getByText('2')).toBeInTheDocument();
    expect(within(loadfileCard!).getByText(String(canonicalKanjiDeck.length - 2))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New loadfile' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'A small local kanji loop that stays honest' })).not.toBeInTheDocument();
  });

  it('can add a new loadfile and delete it with confirmation without wiping the first slot', async () => {
    vi.useRealTimers();

    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    const resetLearnerState = vi.fn(async () => undefined);

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
          lastSeenAt: '2026-04-20T10:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );
    window.history.replaceState({}, '', '/?loadfile=1');

    render(
      <App
        loadfileSchedulerBaseUrl="http://127.0.0.1:8787"
        reviewSchedulerClient={createStubReviewSchedulerClient({ resetLearnerState })}
      />,
    );

    const newLoadfileCard = screen
      .getByRole('heading', { name: 'New loadfile' })
      .closest('article')
      ?.querySelector('button.loadfile-bar') as HTMLElement | null;
    expect(newLoadfileCard).not.toBeNull();
    fireEvent.click(newLoadfileCard!);

    expect(screen.getByRole('heading', { name: 'A small local kanji loop that stays honest' })).toBeInTheDocument();
    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${firstEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Manual intake' }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: secondEntry.kanji },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark encountered' }));

    expect(storage.getItem('kanji-grid-progress-v0:loadfile-2')).toContain(`"${secondEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Loadfiles' }));

    const secondLoadfileDelete = screen.getByRole('button', { name: 'Delete Loadfile 2' });
    fireEvent.click(secondLoadfileDelete);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(resetLearnerState).toHaveBeenCalledWith('local-learner-2');
      expect(storage.getItem('kanji-grid-progress-v0:loadfile-2')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Loadfile 2' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Loadfile 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Loadfile 1' })).toBeInTheDocument();
    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${firstEntry.kanji}"`);

    const replacementLoadfileCard = screen
      .getByRole('heading', { name: 'New loadfile' })
      .closest('article')
      ?.querySelector('button.loadfile-bar') as HTMLElement | null;
    expect(replacementLoadfileCard).not.toBeNull();

    fireEvent.click(replacementLoadfileCard!);

    const replacementRegistry = JSON.parse(storage.getItem('kanji-grid-loadfiles-v1') ?? '{}');
    expect(replacementRegistry.slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'loadfile-2',
          label: 'Loadfile 2',
          learnerId: 'local-learner-2',
          slotNumber: 2,
        }),
      ]),
    );
  });

  it('can delete the final loadfile and create a new one from the empty picker', async () => {
    vi.useRealTimers();

    const resetLearnerState = vi.fn(async () => undefined);

    window.history.replaceState({}, '', '/?loadfile=1');

    render(
      <App
        loadfileSchedulerBaseUrl="http://127.0.0.1:8787"
        reviewSchedulerClient={createStubReviewSchedulerClient({ resetLearnerState })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Loadfile 1' }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(resetLearnerState).toHaveBeenCalledWith('local-learner');
      expect(screen.queryByRole('heading', { name: 'Loadfile 1' })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'New loadfile' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loadfile 1 deleted. No loadfiles remain.');

    const newLoadfileCard = screen
      .getByRole('heading', { name: 'New loadfile' })
      .closest('article')
      ?.querySelector('button.loadfile-bar') as HTMLElement | null;
    expect(newLoadfileCard).not.toBeNull();

    fireEvent.click(newLoadfileCard!);

    expect(
      await screen.findByRole('heading', { name: 'A small local kanji loop that stays honest' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loadfiles' })).toBeInTheDocument();

    const recreatedRegistry = JSON.parse(storage.getItem('kanji-grid-loadfiles-v1') ?? '{}');
    expect(recreatedRegistry.slots).toEqual([
      expect.objectContaining({
        id: 'loadfile-1',
        label: 'Loadfile 1',
        learnerId: 'local-learner',
        slotNumber: 1,
      }),
    ]);
  });

  it('lets the learner rename a loadfile by double-clicking its title', () => {
    window.history.replaceState({}, '', '/?loadfile=1');

    render(<App reviewSchedulerClient={createStubReviewSchedulerClient()} />);

    fireEvent.doubleClick(screen.getByRole('heading', { name: 'Loadfile 1' }));

    const renameInput = screen.getByRole('textbox', { name: 'Rename Loadfile 1' });
    fireEvent.change(renameInput, { target: { value: 'Evening Grind' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: 'Evening Grind' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Evening Grind' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loadfile 1 renamed to Evening Grind.');

    const renamedRegistry = JSON.parse(storage.getItem('kanji-grid-loadfiles-v1') ?? '{}');
    expect(renamedRegistry.slots).toEqual([
      expect.objectContaining({
        id: 'loadfile-1',
        label: 'Evening Grind',
        learnerId: 'local-learner',
        slotNumber: 1,
      }),
    ]);
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

function createStubReviewSchedulerClient(
  overrides: Partial<ReviewSchedulerClient> = {},
): ReviewSchedulerClient {
  return {
    availability: 'configured',
    async getDueReviewKanji() {
      return {
        learnerId: 'local-learner',
        asOf: '2026-04-21T12:00:00.000Z',
        items: [],
        remainingDueCount: 0,
      };
    },
    async recordReviewOutcomes() {},
    async resetLearnerState() {},
    ...overrides,
  };
}
