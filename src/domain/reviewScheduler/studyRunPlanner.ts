import type { KanjiEntry } from '../content/types.js';
import { getDrillById } from '../drills/configs.js';
import {
  buildSessionSelectionPrelude,
  selectPriorityReviewEntries,
  type SessionRandomSource,
} from '../session/sessionSelection.js';
import { DEFAULT_DAILY_NEW_KANJI_LIMIT, type SessionProgressSeedByKanji } from '../session/types.js';
import type { ReviewSchedulerClient } from './client.js';

export type ReviewSelectionSource = 'backend-due' | 'local-fallback' | 'not-needed';

export interface PlanStudyRunSelectionOptions {
  readonly entries: readonly KanjiEntry[];
  readonly drillConfigId: string;
  readonly progressByKanji: SessionProgressSeedByKanji;
  readonly createdAt: string;
  readonly dailyNewLimit?: number;
  readonly learnerId: string;
  readonly random?: SessionRandomSource;
  readonly reviewSchedulerClient: ReviewSchedulerClient;
}

export interface PlannedStudyRunSelection {
  readonly selectedEntries: readonly KanjiEntry[];
  readonly reviewSelectionSource: ReviewSelectionSource;
  readonly schedulerMessage?: string;
}

export async function planStudyRunSelection(
  options: PlanStudyRunSelectionOptions,
): Promise<PlannedStudyRunSelection> {
  const drill = getDrillById(options.drillConfigId);
  const random = options.random ?? Math.random;
  const prelude = buildSessionSelectionPrelude(options.entries, drill.deckSize, {
    createdAt: options.createdAt,
    dailyNewLimit: options.dailyNewLimit,
    progressByKanji: options.progressByKanji,
    random,
  });

  if (prelude.remainingDeckSlots <= 0 || prelude.reviewBankEntries.length === 0) {
    return {
      selectedEntries: [...prelude.carryoverSelection, ...prelude.freshNewSelection],
      reviewSelectionSource: 'not-needed',
    };
  }

  try {
    const dueResponse = await options.reviewSchedulerClient.getDueReviewKanji({
      learnerId: options.learnerId,
      now: options.createdAt,
      limit: prelude.remainingDeckSlots,
    });
    const reviewBankByKanji = new Map(
      prelude.reviewBankEntries.map((entry: KanjiEntry) => [entry.kanji, entry]),
    );
    const dueReviewEntries: KanjiEntry[] = [];

    for (const item of dueResponse.items) {
      const entry = reviewBankByKanji.get(item.kanji);

      if (!entry) {
        continue;
      }

      dueReviewEntries.push(entry);

      if (dueReviewEntries.length >= prelude.remainingDeckSlots) {
        break;
      }
    }

    return {
      selectedEntries: [
        ...prelude.carryoverSelection,
        ...prelude.freshNewSelection,
        ...dueReviewEntries,
      ],
      reviewSelectionSource: 'backend-due',
    };
  } catch (error) {
    const fallbackReviewEntries = selectPriorityReviewEntries(
      prelude.reviewBankEntries,
      prelude.remainingDeckSlots,
      options.progressByKanji,
      random,
    );

    return {
      selectedEntries: [
        ...prelude.carryoverSelection,
        ...prelude.freshNewSelection,
        ...fallbackReviewEntries,
      ],
      reviewSelectionSource: 'local-fallback',
      schedulerMessage:
        error instanceof Error
          ? error.message
          : 'Review scheduler was unavailable; used the local review-bank fallback.',
    };
  }
}

export function planLocalFallbackStudyRunSelection(
  options: Omit<PlanStudyRunSelectionOptions, 'reviewSchedulerClient'>,
): PlannedStudyRunSelection {
  const drill = getDrillById(options.drillConfigId);
  const random = options.random ?? Math.random;
  const prelude = buildSessionSelectionPrelude(options.entries, drill.deckSize, {
    createdAt: options.createdAt,
    dailyNewLimit: options.dailyNewLimit ?? DEFAULT_DAILY_NEW_KANJI_LIMIT,
    progressByKanji: options.progressByKanji,
    random,
  });
  const fallbackReviewEntries = selectPriorityReviewEntries(
    prelude.reviewBankEntries,
    prelude.remainingDeckSlots,
    options.progressByKanji,
    random,
  );

  return {
    selectedEntries: [
      ...prelude.carryoverSelection,
      ...prelude.freshNewSelection,
      ...fallbackReviewEntries,
    ],
    reviewSelectionSource:
      prelude.remainingDeckSlots > 0 && prelude.reviewBankEntries.length > 0
        ? 'local-fallback'
        : 'not-needed',
    schedulerMessage:
      prelude.remainingDeckSlots > 0 && prelude.reviewBankEntries.length > 0
        ? 'Review scheduler is not configured; using the local review-bank fallback.'
        : undefined,
  };
}
