import type { KanjiCode } from '../encoding/palette';

export type SourceSet = 'mock-joyo' | 'joyo' | 'jinmeiyo';

export interface AssignmentVersion {
  readonly id: string;
  readonly sourceSets: readonly SourceSet[];
  readonly strategyId: string;
  readonly codeSpaceSize: number;
  readonly description: string;
}

export interface KanjiMetadata {
  readonly grade?: number;
  readonly jlptLevel?: string;
}

export interface KanjiEntry {
  readonly kanji: string;
  readonly canonicalIndex: number;
  readonly sourceSet: SourceSet;
  readonly assignmentVersionId: AssignmentVersion['id'];
  readonly code: KanjiCode;
  readonly meanings: readonly string[];
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
  readonly tags: readonly string[];
  readonly metadata?: KanjiMetadata;
}
