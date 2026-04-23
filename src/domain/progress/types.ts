export type ProgressConfidence = 'new' | 'learning' | 'familiar';

export interface UserProgress {
  readonly kanji: string;
  readonly seenCount: number;
  readonly goodCount: number;
  readonly firstSeenAt?: string;
  readonly lastSeenAt?: string;
  readonly confidence: ProgressConfidence;
}
