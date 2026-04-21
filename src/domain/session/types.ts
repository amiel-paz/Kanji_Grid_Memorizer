import type { DrillConfig, ReviewGrade } from '../drills/types';

export const CUE_OPACITY_LADDER = [1, 0.66, 0.33, 0] as const;

export type CueOpacity = (typeof CUE_OPACITY_LADDER)[number];

export interface SessionKanjiState {
  readonly kanji: string;
  readonly attempts: number;
  readonly goodCount: number;
  readonly cueOpacity: CueOpacity;
}

export interface SessionState {
  readonly id: string;
  readonly drillConfigId: DrillConfig['id'];
  readonly selectedKanji: readonly string[];
  readonly queue: readonly string[];
  readonly activeKanji: string;
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
  readonly nextActiveKanji: string;
}

export interface SessionAnswerResult {
  readonly session: SessionState;
  readonly event: SessionAnswerEvent;
}
