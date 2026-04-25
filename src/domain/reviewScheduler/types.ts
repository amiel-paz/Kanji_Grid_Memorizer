export type SchedulerReviewGrade = 'again' | 'good';

export interface SchedulerReviewOutcomeInput {
  readonly kanji: string;
  readonly reviewGrade: SchedulerReviewGrade;
  readonly reviewedAt?: string;
}

export interface RecordReviewSchedulerOutcomesRequest {
  readonly learnerId: string;
  readonly outcomes: readonly SchedulerReviewOutcomeInput[];
  readonly updatedAt?: string;
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

export interface GetDueReviewKanjiRequest {
  readonly learnerId: string;
  readonly now: string;
  readonly limit: number;
}

export interface DueReviewKanjiItem {
  readonly kanji: string;
  readonly dueAt: string;
  readonly status: LearnerReviewRecord['status'];
  readonly intervalDays: number;
}

export interface GetDueReviewKanjiResponse {
  readonly learnerId: string;
  readonly asOf: string;
  readonly items: readonly DueReviewKanjiItem[];
  readonly remainingDueCount: number;
}

