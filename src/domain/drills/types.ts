export type DrillMode = 'learn' | 'faded-recall' | 'blind-recall';

export type CuePolicy = 'full' | 'session-dim' | 'hidden';

export type ReviewGrade = 'again' | 'good';

export interface DrillConfig {
  readonly id: string;
  readonly label: string;
  readonly mode: DrillMode;
  readonly deckSize: number;
  readonly cuePolicy: CuePolicy;
}
