import type { DrillMode, ReviewGrade } from '../drills/types';
import type { CueOpacity } from '../session/types';
import type { ProgressConfidence, UserProgress } from './types';

const MAX_RECENT_REVIEW_FAILURE_COUNT = 3;

export interface ProgressReviewOutcome {
  readonly kanji: string;
  readonly drillMode: DrillMode;
  readonly reviewGrade: ReviewGrade;
  readonly previousCueOpacity: CueOpacity;
  readonly nextCueOpacity: CueOpacity;
  readonly reviewedAt?: string;
}

export interface ProgressCarryoverSeed {
  readonly seenCount?: number;
  readonly confidence: ProgressConfidence;
  readonly reviewBankCandidate?: boolean;
  readonly recentReviewFailureCount?: number;
  readonly lastReviewFailureAt?: string;
}

export function createInitialProgress(kanji: string): UserProgress {
  return {
    kanji,
    seenCount: 0,
    goodCount: 0,
    confidence: 'new',
  };
}

export function recordSeen(progress: UserProgress, seenAt?: string): UserProgress {
  const firstSeenAt = progress.firstSeenAt ?? seenAt;

  return {
    ...progress,
    seenCount: progress.seenCount + 1,
    firstSeenAt,
    lastSeenAt: seenAt ?? progress.lastSeenAt,
    confidence: progress.confidence === 'familiar' ? 'familiar' : 'learning',
  };
}

export function hasSeenProgress(progress: ProgressCarryoverSeed | undefined): boolean {
  if (!progress) {
    return false;
  }

  return (progress.seenCount ?? 0) > 0 || progress.confidence !== 'new';
}

export function isUnfinishedNewItemProgress(progress: ProgressCarryoverSeed | undefined): boolean {
  if (!progress) {
    return false;
  }

  return hasSeenProgress(progress) && !isReviewBankCandidateProgress(progress);
}

export function isReviewBankCandidateProgress(progress: ProgressCarryoverSeed | undefined): boolean {
  if (!progress) {
    return false;
  }

  return progress.reviewBankCandidate === true || progress.confidence === 'familiar';
}

export function applyReviewOutcome(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
): UserProgress {
  assertSameKanji(progress, outcome.kanji);

  const seenProgress = recordSeen(progress, outcome.reviewedAt);
  const seenProgressWithoutReviewPriority = withoutReviewPriority(seenProgress);
  const nextGoodCount = seenProgress.goodCount + (outcome.reviewGrade === 'good' ? 1 : 0);
  const reviewBankCandidate = nextReviewBankCandidate(seenProgress, outcome);
  const nextRecentReviewFailureCount = nextRecentReviewFailureCountForOutcome(progress, outcome);
  const nextLastReviewFailureAt = nextLastReviewFailureAtForOutcome(
    progress,
    outcome,
    nextRecentReviewFailureCount,
  );

  return {
    ...seenProgressWithoutReviewPriority,
    goodCount: nextGoodCount,
    confidence: nextConfidenceForReviewOutcome(seenProgress.confidence, outcome),
    ...(reviewBankCandidate ? { reviewBankCandidate: true } : {}),
    ...(nextRecentReviewFailureCount > 0
      ? { recentReviewFailureCount: nextRecentReviewFailureCount }
      : {}),
    ...(nextLastReviewFailureAt !== undefined ? { lastReviewFailureAt: nextLastReviewFailureAt } : {}),
  };
}

function withoutReviewPriority(
  progress: UserProgress,
): Omit<UserProgress, 'recentReviewFailureCount' | 'lastReviewFailureAt'> {
  const nextProgress = { ...progress };
  delete nextProgress.recentReviewFailureCount;
  delete nextProgress.lastReviewFailureAt;
  return nextProgress;
}

function nextConfidenceForReviewOutcome(
  currentConfidence: ProgressConfidence,
  outcome: ProgressReviewOutcome,
): ProgressConfidence {
  if (outcome.reviewGrade === 'again') {
    return 'learning';
  }

  if (completesFadedRecallLadder(outcome)) {
    return 'familiar';
  }

  return currentConfidence === 'familiar' ? 'familiar' : 'learning';
}

function completesFadedRecallLadder(outcome: ProgressReviewOutcome): boolean {
  return outcome.reviewGrade === 'good' && outcome.previousCueOpacity > 0 && outcome.nextCueOpacity === 0;
}

function nextReviewBankCandidate(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
): boolean {
  return progress.reviewBankCandidate === true || completesFadedRecallLadder(outcome);
}

function nextRecentReviewFailureCountForOutcome(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
): number {
  const currentFailureCount = progress.recentReviewFailureCount ?? 0;

  if (!shouldTrackReviewPriorityFromOutcome(progress, outcome)) {
    return currentFailureCount;
  }

  if (outcome.reviewGrade === 'again') {
    return Math.min(MAX_RECENT_REVIEW_FAILURE_COUNT, currentFailureCount + 1);
  }

  return Math.max(0, currentFailureCount - 1);
}

function nextLastReviewFailureAtForOutcome(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
  nextRecentReviewFailureCount: number,
): string | undefined {
  if (!shouldTrackReviewPriorityFromOutcome(progress, outcome)) {
    return progress.lastReviewFailureAt;
  }

  if (outcome.reviewGrade === 'again') {
    return outcome.reviewedAt ?? progress.lastReviewFailureAt;
  }

  return nextRecentReviewFailureCount > 0 ? progress.lastReviewFailureAt : undefined;
}

function shouldTrackReviewPriorityFromOutcome(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
): boolean {
  return outcome.drillMode !== 'learn' && isReviewBankCandidateProgress(progress);
}

function assertSameKanji(progress: UserProgress, kanji: string): void {
  if (progress.kanji !== kanji) {
    throw new Error(`Progress update kanji mismatch: expected ${progress.kanji}, received ${kanji}`);
  }
}
