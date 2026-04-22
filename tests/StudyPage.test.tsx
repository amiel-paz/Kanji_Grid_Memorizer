import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyPage } from '../src/pages/StudyPage';

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
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Study one kanji at a time' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText('Now studying 力')).toBeInTheDocument();
    expect(screen.getAllByText('Hidden until reveal')).toHaveLength(2);
  });

  it('reveals readings before review grading actions and exposes reveal state accessibly', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    const revealButton = screen.getByRole('button', { name: 'Reveal readings and meanings' });

    expect(revealButton).toHaveAttribute('aria-controls', 'study-answer-panel');
    expect(revealButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('heading', { name: 'Readings', level: 4 })).toBeInTheDocument();
    expect(screen.getAllByText('Hidden until reveal')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByText('リョク, リキ')).not.toBeInTheDocument();

    fireEvent.click(revealButton);

    expect(screen.getByRole('heading', { name: 'Meanings', level: 4 })).toBeInTheDocument();
    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    expect(screen.getByText('Answer revealed')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Again',
      'Good',
    ]);
    expect(screen.getByText(/Choose Good if you recalled it cleanly/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('writes progress only after an explicit review grade and reuses existing stored records', () => {
    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        月: {
          kanji: '月',
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    expect(storage.getItem('kanji-grid-progress-v0')).toContain('"月"');

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(storage.getItem('kanji-grid-progress-v0')).toEqual(
      JSON.stringify({
        月: {
          kanji: '月',
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(JSON.parse(storage.getItem('kanji-grid-progress-v0') ?? 'null')).toEqual({
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
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'learning',
      },
    });
  });

  it('starts faded recall from fresh live session state even when stored progress already exists', () => {
    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        力: {
          kanji: '力',
          seenCount: 8,
          goodCount: 6,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'familiar',
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    expect(screen.getByText('Now studying 力')).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText('0 good / 0 attempts')).toBeInTheDocument();
  });

  it('switches to learn mode with persistent readings and next-item navigation', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next kanji' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal readings and meanings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));

    expect(screen.getByText('Now studying 月')).toBeInTheDocument();
    expect(screen.getByText('ゲツ, ガツ')).toBeInTheDocument();
  });

  it('does not persist progress while navigating the learn-mode shell', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));

    expect(storage.getItem('kanji-grid-progress-v0')).toBeNull();
  });

  it('resets reveal state and session position when switching drills', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));

    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next kanji' }));
    expect(screen.getByText('Now studying 月')).toBeInTheDocument();
    expect(screen.getByText('2 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Faded recall/i }));

    expect(screen.getByText('Now studying 力')).toBeInTheDocument();
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.queryByText('リョク, リキ')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal readings and meanings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('recreates faded-recall session state instead of carrying live cue opacity across drill switches', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(screen.getByText('Now studying 月')).toBeInTheDocument();
    expect(JSON.parse(storage.getItem('kanji-grid-progress-v0') ?? 'null')).toEqual({
      力: {
        kanji: '力',
        seenCount: 1,
        goodCount: 1,
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'learning',
      },
    });

    fireEvent.click(screen.getByRole('radio', { name: /Learn/i }));
    fireEvent.click(screen.getByRole('radio', { name: /Faded recall/i }));

    expect(screen.getByText(/^Now studying /)).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText('0 good / 0 attempts')).toBeInTheDocument();
    expect(screen.queryByText('リョク, リキ')).not.toBeInTheDocument();
  });

  it('keeps blind recall cue-hidden before and after grading', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    expect(screen.getByText('Kanji only until reveal')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(screen.getByText('リョク, リキ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Again' }));

    expect(screen.getByText('Now studying 月')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Kanji only until reveal')).toBeInTheDocument();
  });

  it('shows a completion state after the blind-recall batch is fully cleared', () => {
    render(
      <StudyPage
        sessionOptions={{
          id: 'study-page-session',
          random: createDeterministicRandom([0.9, 0.1, 0.5, 0.2, 0.7, 0.3, 0.8, 0.4, 0.6, 0.05]),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    }

    expect(screen.getByRole('heading', { name: 'Session complete', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('This batch is clear')).toBeInTheDocument();
    expect(screen.getByText('10 cleared / 10 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart this drill' })).toBeInTheDocument();
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
