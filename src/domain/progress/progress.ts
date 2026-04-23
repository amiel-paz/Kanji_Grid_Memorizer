import type { ReviewGrade } from '../drills/types';
import type { CueOpacity } from '../session/types';
import type { ProgressConfidence, UserProgress } from './types';

export interface ProgressReviewOutcome {
  readonly kanji: string;
  readonly reviewGrade: ReviewGrade;
  readonly previousCueOpacity: CueOpacity;
  readonly nextCueOpacity: CueOpacity;
  readonly reviewedAt?: string;
}

export interface ProgressCarryoverSeed {
  readonly seenCount?: number;
  readonly confidence: ProgressConfidence;
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

  return hasSeenProgress(progress) && progress.confidence !== 'familiar';
}

export function applyReviewOutcome(
  progress: UserProgress,
  outcome: ProgressReviewOutcome,
): UserProgress {
  assertSameKanji(progress, outcome.kanji);

  const seenProgress = recordSeen(progress, outcome.reviewedAt);
  const nextGoodCount = seenProgress.goodCount + (outcome.reviewGrade === 'good' ? 1 : 0);

  return {
    ...seenProgress,
    goodCount: nextGoodCount,
    confidence: nextConfidenceForReviewOutcome(seenProgress.confidence, outcome),
  };
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

function assertSameKanji(progress: UserProgress, kanji: string): void {
  if (progress.kanji !== kanji) {
    throw new Error(`Progress update kanji mismatch: expected ${progress.kanji}, received ${kanji}`);
  }
}
