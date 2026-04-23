import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import type { KanjiEntry } from '../src/domain/content/types';
import { getDrillById } from '../src/domain/drills/configs';
import { createSession } from '../src/domain/session/session';
import { StudyPage } from '../src/pages/StudyPage';

const STUDY_PAGE_RANDOM_VALUES = [0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05] as const;

function createDeterministicRandom(values: readonly number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length];

    if (value === undefined) {
      throw new Error('Expected at least one deterministic random value.');
    }

    index += 1;
    return value;
  };
}

describe('StudyPage', () => {
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

  it('shows the faded recall shell with cue guidance and session context', () => {
    const { firstEntry } = getExpectedStudyPageEntries();

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    expect(screen.getByRole('heading', { name: 'Study one kanji at a time' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText(/Truly new kanji are capped at 5 per local day/i)).toBeInTheDocument();
    expect(screen.getAllByText('Hidden until reveal')).toHaveLength(2);
  });

  it('reveals readings before review grading actions and exposes reveal state accessibly', () => {
    const { firstEntry, secondEntry } = getExpectedStudyPageEntries();

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    const revealButton = screen.getByRole('button', { name: 'Reveal readings and meanings' });

    expect(revealButton).toHaveAttribute('aria-controls', 'study-answer-panel');
    expect(revealButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: 'Readings', level: 4 })).toBeInTheDocument();
    expect(screen.getAllByText('Hidden until reveal')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByText(getPrimaryRevealText(firstEntry))).not.toBeInTheDocument();

    fireEvent.click(revealButton);

    expect(screen.getByRole('heading', { name: 'Meanings', level: 4 })).toBeInTheDocument();
    expect(screen.getByText(getPrimaryRevealText(firstEntry))).toBeInTheDocument();
    expect(screen.getByText('Answer revealed')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Again',
      'Good',
    ]);
    expect(screen.getByText(/Choose Good if you recalled it cleanly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText(getPrimaryRevealText(secondEntry))).toBeInTheDocument();
  });

  it('writes progress only after an explicit review grade and reuses existing stored records', () => {
    const { firstEntry, secondEntry } = getExpectedStudyPageEntries();

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${secondEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(storage.getItem('kanji-grid-progress-v0')).toEqual(
      JSON.stringify({
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(JSON.parse(storage.getItem('kanji-grid-progress-v0') ?? 'null')).toEqual({
      [secondEntry.kanji]: {
        kanji: secondEntry.kanji,
        seenCount: 2,
        goodCount: 1,
        lastSeenAt: '2026-04-20T12:00:00.000Z',
        confidence: 'learning',
      },
      [firstEntry.kanji]: {
        kanji: firstEntry.kanji,
        seenCount: 1,
        goodCount: 1,
        firstSeenAt: '2026-04-21T12:00:00.000Z',
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'learning',
      },
    });
  });

  it('seeds faded recall from durable progress while keeping live session counts fresh', () => {
    const sessionOptions = {
      id: 'seeded-study-page-session',
      random: () => 0,
      dailyNewLimit: 0,
    };
    const firstEntry = canonicalKanjiDeck[0];

    if (!firstEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 8,
          goodCount: 6,
          firstSeenAt: '2026-04-20T10:00:00.000Z',
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'familiar',
        },
      }),
    );

    render(<StudyPage sessionOptions={sessionOptions} />);

    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 33%')).toBeInTheDocument();
    expect(screen.getByText('0 good / 0 attempts')).toBeInTheDocument();
  });

  it('switches to learn mode with persistent readings and next-item navigation', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^Now studying / })).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Meanings', level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Readings', level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next kanji' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal readings and meanings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();

    const learnHeadingText = screen.getByRole('heading', { level: 2, name: /^Now studying / }).textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));
    expect(screen.getByRole('heading', { level: 2, name: /^Now studying / }).textContent).not.toBe(learnHeadingText);
  });

  it('does not persist progress while navigating the learn-mode shell', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));

    expect(storage.getItem('kanji-grid-progress-v0')).toBeNull();
  });

  it('resets reveal state and session position when switching drills', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { level: 2, name: /^Now studying / })).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));
    expect(screen.getByText('2 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Faded recall/i }));

    expect(screen.getByRole('heading', { level: 2, name: /^Now studying / })).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal readings and meanings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('recreates faded-recall session state from saved progress instead of carrying live cue opacity across drill switches', () => {
    const sessionOptions = {
      id: 'stable-seeded-session',
      random: () => 0,
    };
    const { firstEntry, secondEntry } = getExpectedStudyPageEntries(sessionOptions);

    render(<StudyPage sessionOptions={sessionOptions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(screen.getByText(`Now studying ${secondEntry.kanji}`)).toBeInTheDocument();
    expect(JSON.parse(storage.getItem('kanji-grid-progress-v0') ?? 'null')).toEqual({
      [firstEntry.kanji]: {
        kanji: firstEntry.kanji,
        seenCount: 1,
        goodCount: 1,
        firstSeenAt: '2026-04-21T12:00:00.000Z',
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'learning',
      },
    });

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));
    fireEvent.click(screen.getByRole('radio', { name: /Faded recall/i }));

    expect(screen.getByText(/^Now studying /)).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 66%')).toBeInTheDocument();
    expect(screen.getByText('0 good / 0 attempts')).toBeInTheDocument();
    expect(screen.queryByText(getPrimaryRevealText(firstEntry))).not.toBeInTheDocument();
  });

  it('keeps blind recall cue-hidden before and after grading', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));
    const firstHeadingText = screen.getByRole('heading', { level: 2, name: /^Now studying / }).textContent;

    expect(screen.getByText('Kanji only until reveal')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Kanji only until reveal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('shows a completion state after the blind-recall batch is fully cleared', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    }

    expect(screen.getByRole('heading', { name: 'Session complete', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('This batch is clear')).toBeInTheDocument();
    expect(screen.getByText('5 cleared / 5 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart this drill' })).toBeInTheDocument();
  });
});

function createStudyPageSessionOptions() {
  return {
    id: 'study-page-session',
    random: createDeterministicRandom(STUDY_PAGE_RANDOM_VALUES),
  };
}

function getExpectedStudyPageEntries(sessionOptions = createStudyPageSessionOptions()): {
  readonly firstEntry: KanjiEntry;
  readonly secondEntry: KanjiEntry;
  readonly selectedEntries: readonly KanjiEntry[];
} {
  const session = createSession(
    canonicalKanjiDeck,
    getDrillById('faded-recall'),
    sessionOptions,
  );

  const selectedEntries = session.selectedKanji.map((kanji) => {
    const entry = canonicalKanjiDeck.find((candidate) => candidate.kanji === kanji);

    if (!entry) {
      throw new Error(`Expected canonical deck entry for ${kanji}.`);
    }

    return entry;
  });

  const [firstEntry, secondEntry] = selectedEntries;

  if (!firstEntry || !secondEntry) {
    throw new Error('Expected study-page session to select at least two kanji.');
  }

  return {
    firstEntry,
    secondEntry,
    selectedEntries,
  };
}

function getPrimaryRevealText(entry: KanjiEntry): string {
  return entry.onyomi[0] !== undefined && entry.onyomi.length > 0
    ? entry.onyomi.join(', ')
    : entry.meanings.join(', ');
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
