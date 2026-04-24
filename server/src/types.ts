export type SchedulerReviewGrade = 'again' | 'good';

export interface SchedulerReviewOutcomeInput {
  readonly kanji: string;
  readonly reviewGrade: SchedulerReviewGrade;
  readonly reviewedAt?: string;
}

export interface LearnerReviewRecord {
  readonly kanji: string;
  readonly status: 'learning' | 'review';
  readonly successCount: number;
  readonly lapseCount: number;
  readonly intervalDays: number;
  readonly dueAt: string;
  readonly lastReviewedAt?: string;
  readonly lastGrade?: SchedulerReviewGrade;
}

export interface LearnerSchedulerState {
  readonly learnerId: string;
  readonly recordsByKanji: Readonly<Record<string, LearnerReviewRecord>>;
  readonly updatedAt: string;
}

export interface SchedulerPlan {
  readonly learnerId: string;
  readonly asOf: string;
  readonly dueKanji: readonly string[];
  readonly upcomingKanji: readonly string[];
  readonly remainingDueCount: number;
}
