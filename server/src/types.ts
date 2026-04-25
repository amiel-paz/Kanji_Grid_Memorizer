export type {
  DueReviewKanjiItem,
  GetDueReviewKanjiRequest,
  GetDueReviewKanjiResponse,
  LearnerReviewRecord,
  LearnerSchedulerState,
  SchedulerReviewGrade,
  SchedulerReviewOutcomeInput,
} from '../../src/domain/reviewScheduler/types.js';

export interface SchedulerPlan {
  readonly learnerId: string;
  readonly asOf: string;
  readonly dueKanji: readonly string[];
  readonly upcomingKanji: readonly string[];
  readonly remainingDueCount: number;
}
