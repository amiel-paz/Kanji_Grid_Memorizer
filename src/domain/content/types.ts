import type { KanjiCode } from '../encoding/palette';

export const SOURCE_SET_IDS = {
  MOCK_JOYO: 'mock-joyo',
  JOYO: 'joyo',
  JINMEIYO: 'jinmeiyo',
} as const;

export type SourceSet = (typeof SOURCE_SET_IDS)[keyof typeof SOURCE_SET_IDS];

export type SourceSetOwnership = 'development-fixture' | 'future-canonical-import';

export interface SourceSetDefinition {
  readonly id: SourceSet;
  readonly label: string;
  readonly ownership: SourceSetOwnership;
  readonly description: string;
}

export const SOURCE_SET_DEFINITIONS = {
  [SOURCE_SET_IDS.MOCK_JOYO]: {
    id: SOURCE_SET_IDS.MOCK_JOYO,
    label: 'Mock Joyo scaffold',
    ownership: 'development-fixture',
    description:
      'Handwritten local scaffold entries shaped like a tiny Joyo-like deck. This is not canonical Joyo data.',
  },
  [SOURCE_SET_IDS.JOYO]: {
    id: SOURCE_SET_IDS.JOYO,
    label: 'Joyo',
    ownership: 'future-canonical-import',
    description:
      'Future canonical Joyo source set. Import provenance and source version mapping must be explicit before use.',
  },
  [SOURCE_SET_IDS.JINMEIYO]: {
    id: SOURCE_SET_IDS.JINMEIYO,
    label: 'Jinmeiyo',
    ownership: 'future-canonical-import',
    description:
      'Future canonical Jinmeiyo source set. It should be added after Joyo with its own import provenance.',
  },
} as const satisfies Record<SourceSet, SourceSetDefinition>;

export const CANONICAL_SOURCE_SET_PRIORITY = [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO] as const;

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
