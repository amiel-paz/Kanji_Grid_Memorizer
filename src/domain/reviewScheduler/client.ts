import type {
  GetDueReviewKanjiRequest,
  GetDueReviewKanjiResponse,
  RecordReviewSchedulerOutcomesRequest,
} from './types.js';

export interface ReviewSchedulerClient {
  readonly availability: 'configured' | 'disabled';
  getDueReviewKanji(request: GetDueReviewKanjiRequest): Promise<GetDueReviewKanjiResponse>;
  recordReviewOutcomes(request: RecordReviewSchedulerOutcomesRequest): Promise<void>;
  resetLearnerState(learnerId: string): Promise<void>;
}

export class ReviewSchedulerClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewSchedulerClientError';
  }
}

export function createDisabledReviewSchedulerClient(
  reason = 'Review scheduler is not configured.',
): ReviewSchedulerClient {
  return {
    availability: 'disabled',
    async getDueReviewKanji() {
      throw new ReviewSchedulerClientError(reason);
    },
    async recordReviewOutcomes() {
      throw new ReviewSchedulerClientError(reason);
    },
    async resetLearnerState() {
      throw new ReviewSchedulerClientError(reason);
    },
  };
}

export function createFetchReviewSchedulerClient(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ReviewSchedulerClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return {
    availability: 'configured',
    async getDueReviewKanji(request) {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/learners/${encodeURIComponent(request.learnerId)}/due-review-kanji`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            now: request.now,
            limit: request.limit,
          }),
        },
      );

      if (!response.ok) {
        throw new ReviewSchedulerClientError(
          `Due review request failed with ${response.status}.`,
        );
      }

      return (await response.json()) as GetDueReviewKanjiResponse;
    },

    async recordReviewOutcomes(request) {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/learners/${encodeURIComponent(request.learnerId)}/scheduler/review-outcomes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            outcomes: request.outcomes,
            updatedAt: request.updatedAt,
          }),
        },
      );

      if (!response.ok) {
        throw new ReviewSchedulerClientError(
          `Review outcome request failed with ${response.status}.`,
        );
      }
    },

    async resetLearnerState(learnerId) {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/learners/${encodeURIComponent(learnerId)}/scheduler`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new ReviewSchedulerClientError(
          `Scheduler reset request failed with ${response.status}.`,
        );
      }
    },
  };
}
