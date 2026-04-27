import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalKanjiDeck } from '../src/data/canonicalDeck';
import type { KanjiEntry } from '../src/domain/content/types';
import { getDrillById } from '../src/domain/drills/configs';
import type { ReviewSchedulerClient } from '../src/domain/reviewScheduler/client';
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

    expect(screen.getByRole('heading', { name: 'A small local kanji loop that stays honest' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall' })).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText(/carryover and the daily new limit still stay local/i)).toBeInTheDocument();
    expect(screen.getByText(/falls back to the older local review-bank heuristic/i)).toBeInTheDocument();
    expect(screen.getByText('0 carryover, 5 new, 0 review')).toBeInTheDocument();
    expect(screen.getByText('No due review needed')).toBeInTheDocument();
    expect(screen.getByText('No recent-miss boost in this batch')).toBeInTheDocument();
    expect(screen.getByText('5 of 5 fresh slots left')).toBeInTheDocument();
    expect(screen.getAllByText('Hidden until reveal')).toHaveLength(2);
  });

  it('carries unfinished new kanji forward before admitting replacement new kanji', () => {
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
          firstSeenAt: '2026-04-20T12:00:00.000Z',
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:00:00.000Z',
          lastSeenAt: '2026-04-21T09:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'carryover-study-page-session',
          dailyNewLimit: 2,
          random: createDeterministicRandom([0, 0, 0.9]),
        }}
      />,
    );

    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(screen.getByText(`Now studying ${secondEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
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
    const { firstEntry } = getExpectedStudyPageEntries();

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    expect(storage.getItem('kanji-grid-progress-v0')).toContain(`"${firstEntry.kanji}"`);

    fireEvent.click(screen.getByRole('button', { name: 'Reveal readings and meanings' }));

    expect(storage.getItem('kanji-grid-progress-v0')).toEqual(
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 2,
          goodCount: 1,
          lastSeenAt: '2026-04-20T12:00:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Good' }));

    expect(JSON.parse(storage.getItem('kanji-grid-progress-v0') ?? 'null')).toEqual({
      [firstEntry.kanji]: {
        kanji: firstEntry.kanji,
        seenCount: 3,
        goodCount: 2,
        firstSeenAt: '2026-04-21T12:00:00.000Z',
        lastSeenAt: '2026-04-21T12:00:00.000Z',
        confidence: 'learning',
      },
    });
  });

  it('starts faded recall at full cue even when durable progress already exists', () => {
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
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
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

  it('recreates faded-recall session state at full cue instead of carrying live cue opacity across drill switches', () => {
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
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
    expect(screen.getByText('0 good / 0 attempts')).toBeInTheDocument();
    expect(screen.queryByText(getPrimaryRevealText(firstEntry))).not.toBeInTheDocument();
  });

  it('switches to reading MCQ with a readings prompt and four kanji choices', () => {
    const { firstEntry } = getExpectedStudyPageEntries();

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Reading MCQ/i }));

    expect(screen.getByRole('heading', { name: 'Reading MCQ' })).toBeInTheDocument();
    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('Which kanji matches these readings?')).toBeInTheDocument();
    expect(screen.getByText('Not used in this drill')).toBeInTheDocument();
    expect(screen.getByText('Choices visible')).toBeInTheDocument();
    expect(screen.getByText('Reading prompt plus 4 kanji choices')).toBeInTheDocument();
    const choiceGroup = screen.getByRole('group', { name: 'Reading MCQ choices' });
    const choiceButtons = within(choiceGroup).getAllByRole('button');

    expect(choiceButtons).toHaveLength(4);
    expect(within(choiceButtons[0]!).getByRole('img')).toBeInTheDocument();
    expect(
      within(choiceGroup).getByRole('img', { name: `${firstEntry.kanji} reading MCQ choice card` }),
    ).toBeInTheDocument();
    expect(
      within(choiceGroup).getByRole('img', { name: `${firstEntry.kanji} reading MCQ choice card` }),
    ).toHaveClass('kanji-cue-card-sm');
  });

  it('uses the existing progress flow when a reading MCQ answer is correct', () => {
    const { firstEntry, secondEntry } = getExpectedStudyPageEntries();

    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Reading MCQ/i }));
    fireEvent.click(screen.getByRole('button', { name: firstEntry.kanji }));

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
  });

  it('treats durable review-bank candidates as later-session backfill instead of unfinished carryover', () => {
    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 5,
          goodCount: 3,
          firstSeenAt: '2026-04-20T12:00:00.000Z',
          lastSeenAt: '2026-04-21T11:00:00.000Z',
          confidence: 'learning',
          reviewBankCandidate: true,
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'review-bank-study-page-session',
          dailyNewLimit: 1,
          random: createDeterministicRandom([0, 0]),
        }}
      />,
    );

    expect(screen.getByText(`Now studying ${secondEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Cue visible at 100%')).toBeInTheDocument();
  });

  it('shows when a selected review card was boosted by recent repeated misses', () => {
    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 5,
          goodCount: 3,
          firstSeenAt: '2026-04-18T12:00:00.000Z',
          lastSeenAt: '2026-04-21T11:00:00.000Z',
          confidence: 'learning',
          reviewBankCandidate: true,
          recentReviewFailureCount: 2,
          lastReviewFailureAt: '2026-04-21T10:30:00.000Z',
        },
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 5,
          goodCount: 4,
          firstSeenAt: '2026-04-18T11:00:00.000Z',
          lastSeenAt: '2026-04-21T10:00:00.000Z',
          confidence: 'familiar',
          reviewBankCandidate: true,
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'priority-review-study-page-session',
          dailyNewLimit: 0,
          random: createDeterministicRandom([0.9, 0.1]),
        }}
      />,
    );

    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('1 recent-miss review card')).toBeInTheDocument();
  });

  it('keeps blind recall cue-hidden before and after grading', () => {
    render(<StudyPage sessionOptions={createStudyPageSessionOptions()} />);

    fireEvent.click(screen.getByRole('radio', { name: /Blind recall/i }));

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

  it('shows an honest empty state when no cards can enter a new local batch yet', () => {
    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        仮A: {
          kanji: '仮A',
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:00:00.000Z',
          lastSeenAt: '2026-04-21T09:00:00.000Z',
          confidence: 'learning',
        },
        仮B: {
          kanji: '仮B',
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:05:00.000Z',
          lastSeenAt: '2026-04-21T09:05:00.000Z',
          confidence: 'learning',
        },
        仮C: {
          kanji: '仮C',
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:10:00.000Z',
          lastSeenAt: '2026-04-21T09:10:00.000Z',
          confidence: 'learning',
        },
        仮D: {
          kanji: '仮D',
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:15:00.000Z',
          lastSeenAt: '2026-04-21T09:15:00.000Z',
          confidence: 'learning',
        },
        仮E: {
          kanji: '仮E',
          seenCount: 1,
          goodCount: 0,
          firstSeenAt: '2026-04-21T09:20:00.000Z',
          lastSeenAt: '2026-04-21T09:20:00.000Z',
          confidence: 'learning',
        },
      }),
    );

    render(
      <StudyPage
        sessionOptions={{
          id: 'empty-study-page-session',
          dailyNewLimit: 5,
          random: createDeterministicRandom([0, 0, 0]),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Nothing queued right now', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faded recall waiting', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getAllByText('No active card')).toHaveLength(2);
    expect(screen.getByText('0 carryover, 0 new, 0 review')).toBeInTheDocument();
    expect(screen.getByText('0 of 5 fresh slots left')).toBeInTheDocument();
    expect(screen.getByText(/No active card is queued yet\. Fresh-new slots left today: 0 of 5\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart this drill' })).toBeInTheDocument();
  });

  it('uses the configured backend scheduler for due review selection', async () => {
    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 5,
          goodCount: 4,
          firstSeenAt: '2026-04-18T12:00:00.000Z',
          lastSeenAt: '2026-04-21T11:00:00.000Z',
          confidence: 'familiar',
          reviewBankCandidate: true,
        },
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 5,
          goodCount: 3,
          firstSeenAt: '2026-04-18T11:00:00.000Z',
          lastSeenAt: '2026-04-21T10:00:00.000Z',
          confidence: 'familiar',
          reviewBankCandidate: true,
        },
      }),
    );

    const reviewSchedulerClient: ReviewSchedulerClient = {
      availability: 'configured',
      getDueReviewKanji: vi.fn().mockResolvedValue({
        learnerId: 'local-learner',
        asOf: '2026-04-21T12:00:00.000Z',
        items: [
          {
            kanji: secondEntry.kanji,
            dueAt: '2026-04-21T09:00:00.000Z',
            status: 'review',
            intervalDays: 7,
          },
        ],
        remainingDueCount: 0,
      }),
      recordReviewOutcomes: vi.fn().mockResolvedValue(undefined),
      resetLearnerState: vi.fn().mockResolvedValue(undefined),
    };

    await act(async () => {
      render(
        <StudyPage
          reviewSchedulerClient={reviewSchedulerClient}
          sessionOptions={{
            id: 'backend-study-page-session',
            dailyNewLimit: 0,
            random: createDeterministicRandom([0, 0]),
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(screen.getByText(`Now studying ${secondEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('Backend due schedule')).toBeInTheDocument();
    expect(screen.getByText('0 carryover, 0 new, 1 review')).toBeInTheDocument();
    expect(reviewSchedulerClient.getDueReviewKanji).toHaveBeenCalledWith({
      learnerId: 'local-learner',
      now: '2026-04-21T12:00:00.000Z',
      limit: 10,
    });
  });

  it('falls back clearly when the configured backend scheduler errors', async () => {
    const [firstEntry, secondEntry] = canonicalKanjiDeck;

    if (!firstEntry || !secondEntry) {
      throw new Error('Expected canonical deck data.');
    }

    storage.setItem(
      'kanji-grid-progress-v0',
      JSON.stringify({
        [firstEntry.kanji]: {
          kanji: firstEntry.kanji,
          seenCount: 5,
          goodCount: 3,
          firstSeenAt: '2026-04-18T12:00:00.000Z',
          lastSeenAt: '2026-04-21T11:00:00.000Z',
          confidence: 'familiar',
          reviewBankCandidate: true,
          recentReviewFailureCount: 2,
          lastReviewFailureAt: '2026-04-21T10:30:00.000Z',
        },
        [secondEntry.kanji]: {
          kanji: secondEntry.kanji,
          seenCount: 5,
          goodCount: 4,
          firstSeenAt: '2026-04-18T11:00:00.000Z',
          lastSeenAt: '2026-04-21T10:00:00.000Z',
          confidence: 'familiar',
          reviewBankCandidate: true,
        },
      }),
    );

    const reviewSchedulerClient: ReviewSchedulerClient = {
      availability: 'configured',
      getDueReviewKanji: vi.fn().mockRejectedValue(new Error('Scheduler offline')),
      recordReviewOutcomes: vi.fn().mockResolvedValue(undefined),
      resetLearnerState: vi.fn().mockResolvedValue(undefined),
    };

    await act(async () => {
      render(
        <StudyPage
          reviewSchedulerClient={reviewSchedulerClient}
          sessionOptions={{
            id: 'backend-fallback-study-page-session',
            dailyNewLimit: 0,
            random: createDeterministicRandom([0.9, 0.1]),
          }}
        />,
      );
      await Promise.resolve();
    });

    expect(screen.getByText(`Now studying ${firstEntry.kanji}`)).toBeInTheDocument();
    expect(screen.getByText('Local fallback')).toBeInTheDocument();
    expect(screen.getByText('Scheduler offline')).toBeInTheDocument();
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
