import type { DrillConfig } from '../drills/types';

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
  readonly activeKanji: string;
  readonly itemStateByKanji: Readonly<Record<string, SessionKanjiState>>;
}
