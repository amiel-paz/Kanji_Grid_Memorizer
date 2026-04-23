import type { DrillConfig, ReviewGrade } from '../drills/types';
import type { ProgressConfidence } from '../progress/types';

export const CUE_OPACITY_LADDER = [1, 0.66, 0.33, 0] as const;
export const DEFAULT_DAILY_NEW_KANJI_LIMIT = 5;

export type CueOpacity = (typeof CUE_OPACITY_LADDER)[number];

export interface SessionKanjiState {
  readonly kanji: string;
  readonly attempts: number;
  readonly goodCount: number;
  readonly againCount: number;
  readonly cueOpacity: CueOpacity;
}

export interface SessionProgressSeed {
  readonly kanji: string;
  readonly confidence: ProgressConfidence;
  readonly seenCount?: number;
  readonly firstSeenAt?: string;
  readonly reviewBankCandidate?: boolean;
}

export type SessionProgressSeedByKanji = Readonly<Record<string, SessionProgressSeed>>;

export interface SessionState {
  readonly id: string;
  readonly drillConfigId: DrillConfig['id'];
  readonly selectedKanji: readonly string[];
  readonly queue: readonly string[];
  readonly activeKanji: string | null;
  readonly itemStateByKanji: Readonly<Record<string, SessionKanjiState>>;
}

export interface SessionAnswerEvent {
  readonly type: 'review-answer';
  readonly kanji: string;
  readonly reviewGrade: ReviewGrade;
  readonly previousCueOpacity: CueOpacity;
  readonly nextCueOpacity: CueOpacity;
  readonly queueBefore: readonly string[];
  readonly queueAfter: readonly string[];
  readonly nextActiveKanji: string | null;
}

export interface SessionAnswerResult {
  readonly session: SessionState;
  readonly event: SessionAnswerEvent;
}
