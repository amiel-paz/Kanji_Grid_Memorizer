import { describe, expect, it, vi } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { getDrillById } from '../src/domain/drills/configs';
import type { ReviewSchedulerClient } from '../src/domain/reviewScheduler/client';
import { planStudyRunSelection } from '../src/domain/reviewScheduler/studyRunPlanner';
import { createSession } from '../src/domain/session/session';

describe('study run planner', () => {
  it('uses backend due items for the review slice while keeping content and session ownership local', async () => {
    const entries = mockKanji.slice(0, 4);
    const backendClient: ReviewSchedulerClient = {
      availability: 'configured',
      getDueReviewKanji: vi.fn().mockResolvedValue({
        learnerId: 'local-learner',
        asOf: '2026-04-24T12:00:00.000Z',
        items: [
          {
            kanji: entries[1]!.kanji,
            dueAt: '2026-04-24T09:00:00.000Z',
            status: 'review',
            intervalDays: 7,
          },
        ],
        remainingDueCount: 0,
      }),
      recordReviewOutcomes: vi.fn().mockResolvedValue(undefined),
      resetLearnerState: vi.fn().mockResolvedValue(undefined),
    };

    const plan = await planStudyRunSelection({
      createdAt: '2026-04-24T12:00:00.000Z',
      dailyNewLimit: 1,
      drillConfigId: 'faded-recall',
      entries,
      learnerId: 'local-learner',
      progressByKanji: {
        [entries[0]!.kanji]: {
          kanji: entries[0]!.kanji,
          confidence: 'learning',
          seenCount: 1,
          firstSeenAt: '2026-04-23T12:00:00.000Z',
        },
        [entries[1]!.kanji]: {
          kanji: entries[1]!.kanji,
          confidence: 'familiar',
          seenCount: 5,
          reviewBankCandidate: true,
        },
        [entries[2]!.kanji]: {
          kanji: entries[2]!.kanji,
          confidence: 'familiar',
          seenCount: 4,
          reviewBankCandidate: true,
        },
      },
      random: () => 0,
      reviewSchedulerClient: backendClient,
    });

    expect(plan.reviewSelectionSource).toBe('backend-due');
    expect(plan.selectedEntries.map((entry) => entry.kanji)).toEqual([
      entries[0]!.kanji,
      entries[1]!.kanji,
    ]);
    expect(plan.selectedEntries[1]).toBe(entries[1]);

    const session = createSession(entries, getDrillById('faded-recall'), {
      selectedEntries: plan.selectedEntries,
    });

    expect(session.selectedKanji).toEqual([
      entries[0]!.kanji,
      entries[1]!.kanji,
    ]);
    expect(session.itemStateByKanji[entries[1]!.kanji]).toMatchObject({
      kanji: entries[1]!.kanji,
      attempts: 0,
      goodCount: 0,
      againCount: 0,
      cueOpacity: 1,
    });
    expect(session.itemStateByKanji[entries[1]!.kanji]).not.toHaveProperty('dueAt');
  });

  it('falls back to the local review-bank heuristic when the backend scheduler fails', async () => {
    const entries = mockKanji.slice(0, 3);
    const backendClient: ReviewSchedulerClient = {
      availability: 'configured',
      getDueReviewKanji: vi.fn().mockRejectedValue(new Error('Scheduler offline')),
      recordReviewOutcomes: vi.fn().mockResolvedValue(undefined),
      resetLearnerState: vi.fn().mockResolvedValue(undefined),
    };

    const plan = await planStudyRunSelection({
      createdAt: '2026-04-24T12:00:00.000Z',
      dailyNewLimit: 0,
      drillConfigId: 'faded-recall',
      entries,
      learnerId: 'local-learner',
      progressByKanji: {
        [entries[0]!.kanji]: {
          kanji: entries[0]!.kanji,
          confidence: 'familiar',
          seenCount: 5,
          reviewBankCandidate: true,
          recentReviewFailureCount: 2,
          lastReviewFailureAt: '2026-04-24T08:00:00.000Z',
        },
        [entries[1]!.kanji]: {
          kanji: entries[1]!.kanji,
          confidence: 'familiar',
          seenCount: 5,
          reviewBankCandidate: true,
        },
      },
      random: () => 0,
      reviewSchedulerClient: backendClient,
    });

    expect(plan.reviewSelectionSource).toBe('local-fallback');
    expect(plan.schedulerMessage).toBe('Scheduler offline');
    expect(plan.selectedEntries.map((entry) => entry.kanji)).toEqual([
      entries[0]!.kanji,
      entries[1]!.kanji,
    ]);
  });
});
