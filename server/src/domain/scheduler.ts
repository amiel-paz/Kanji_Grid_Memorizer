import type {
  GetDueReviewKanjiResponse,
  LearnerReviewRecord,
  LearnerSchedulerState,
  SchedulerPlan,
  SchedulerReviewOutcomeInput,
} from '../types.js';

const INITIAL_GOOD_INTERVAL_DAYS = 1;
const AGAIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 120;

export function createEmptyLearnerSchedulerState(
  learnerId: string,
  updatedAt: string = new Date().toISOString(),
): LearnerSchedulerState {
  return {
    learnerId,
    recordsByKanji: {},
    updatedAt,
  };
}

export function applyReviewOutcomes(
  state: LearnerSchedulerState,
  outcomes: readonly SchedulerReviewOutcomeInput[],
  updatedAt: string = new Date().toISOString(),
): LearnerSchedulerState {
  let recordsByKanji = { ...state.recordsByKanji };

  for (const outcome of outcomes) {
    const reviewedAt = outcome.reviewedAt ?? updatedAt;
    const currentRecord = recordsByKanji[outcome.kanji];
    const nextRecord = nextLearnerReviewRecord(currentRecord, outcome, reviewedAt);
    recordsByKanji = {
      ...recordsByKanji,
      [outcome.kanji]: nextRecord,
    };
  }

  return {
    ...state,
    recordsByKanji,
    updatedAt,
  };
}

export function createSchedulerPlan(
  state: LearnerSchedulerState,
  {
    asOf = new Date().toISOString(),
    limit = 10,
  }: {
    readonly asOf?: string;
    readonly limit?: number;
  } = {},
): SchedulerPlan {
  const dueRecords: LearnerReviewRecord[] = [];
  const upcomingRecords: LearnerReviewRecord[] = [];
  const asOfTimestamp = parseTimestamp(asOf);

  for (const record of Object.values(state.recordsByKanji)) {
    if (parseTimestamp(record.dueAt) <= asOfTimestamp) {
      dueRecords.push(record);
      continue;
    }

    upcomingRecords.push(record);
  }

  dueRecords.sort(compareReviewRecordsByDueDate);
  upcomingRecords.sort(compareReviewRecordsByDueDate);

  return {
    learnerId: state.learnerId,
    asOf,
    dueKanji: dueRecords.slice(0, limit).map((record) => record.kanji),
    upcomingKanji: upcomingRecords.slice(0, limit).map((record) => record.kanji),
    remainingDueCount: Math.max(0, dueRecords.length - limit),
  };
}

export function getDueReviewKanji(
  state: LearnerSchedulerState,
  {
    now,
    limit,
  }: {
    readonly now: string;
    readonly limit: number;
  },
): GetDueReviewKanjiResponse {
  const asOfTimestamp = parseTimestamp(now);
  const dueRecords = Object.values(state.recordsByKanji)
    .filter((record) => parseTimestamp(record.dueAt) <= asOfTimestamp)
    .sort(compareReviewRecordsByDueDate);

  return {
    learnerId: state.learnerId,
    asOf: now,
    items: dueRecords.slice(0, limit).map((record) => ({
      kanji: record.kanji,
      dueAt: record.dueAt,
      status: record.status,
      intervalDays: record.intervalDays,
    })),
    remainingDueCount: Math.max(0, dueRecords.length - limit),
  };
}

function nextLearnerReviewRecord(
  currentRecord: LearnerReviewRecord | undefined,
  outcome: SchedulerReviewOutcomeInput,
  reviewedAt: string,
): LearnerReviewRecord {
  if (outcome.reviewGrade === 'again') {
    return {
      kanji: outcome.kanji,
      status: 'learning',
      successCount: currentRecord?.successCount ?? 0,
      lapseCount: (currentRecord?.lapseCount ?? 0) + 1,
      intervalDays: AGAIN_INTERVAL_DAYS,
      dueAt: addDays(reviewedAt, AGAIN_INTERVAL_DAYS),
      lastReviewedAt: reviewedAt,
      lastGrade: outcome.reviewGrade,
    };
  }

  const nextIntervalDays = nextGoodIntervalDays(currentRecord?.intervalDays ?? 0);

  return {
    kanji: outcome.kanji,
    status: nextIntervalDays >= 7 ? 'review' : 'learning',
    successCount: (currentRecord?.successCount ?? 0) + 1,
    lapseCount: currentRecord?.lapseCount ?? 0,
    intervalDays: nextIntervalDays,
    dueAt: addDays(reviewedAt, nextIntervalDays),
    lastReviewedAt: reviewedAt,
    lastGrade: outcome.reviewGrade,
  };
}

function nextGoodIntervalDays(currentIntervalDays: number): number {
  if (currentIntervalDays <= 0) {
    return INITIAL_GOOD_INTERVAL_DAYS;
  }

  if (currentIntervalDays === 1) {
    return 3;
  }

  if (currentIntervalDays === 3) {
    return 7;
  }

  return Math.min(MAX_INTERVAL_DAYS, currentIntervalDays * 2);
}

function addDays(timestamp: string, days: number): string {
  const nextDate = new Date(timestamp);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate.toISOString();
}

function parseTimestamp(timestamp: string): number {
  const parsed = Date.parse(timestamp);

  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function compareReviewRecordsByDueDate(
  left: LearnerReviewRecord,
  right: LearnerReviewRecord,
): number {
  return parseTimestamp(left.dueAt) - parseTimestamp(right.dueAt) || left.kanji.localeCompare(right.kanji);
}
