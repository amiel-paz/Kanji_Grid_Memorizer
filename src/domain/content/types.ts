import type { KanjiCode } from '../encoding/palette';

export const SOURCE_SET_IDS = {
  MOCK_JOYO: 'mock-joyo',
  JOYO: 'joyo',
  JINMEIYO: 'jinmeiyo',
} as const;

export type SourceSet = (typeof SOURCE_SET_IDS)[keyof typeof SOURCE_SET_IDS];
export type CanonicalSourceSet = Exclude<SourceSet, typeof SOURCE_SET_IDS.MOCK_JOYO>;

export type SourceSetOwnership = 'development-fixture' | 'canonical-import';

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
    ownership: 'canonical-import',
    description:
      'Canonical Joyo source set. Real deck imports must point to an explicit Joyo source-set version.',
  },
  [SOURCE_SET_IDS.JINMEIYO]: {
    id: SOURCE_SET_IDS.JINMEIYO,
    label: 'Jinmeiyo',
    ownership: 'canonical-import',
    description:
      'Canonical Jinmeiyo source set. It remains a separate supplemental import path after Joyo.',
  },
} as const satisfies Record<SourceSet, SourceSetDefinition>;

export const CANONICAL_SOURCE_SET_PRIORITY = [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO] as const;

export interface SourceSetVersion {
  readonly sourceSet: SourceSet;
  readonly versionId: string;
  readonly label: string;
  readonly provenance: string;
  readonly notes: string;
}

export interface SourceSetUpstreamReference {
  readonly label: string;
  readonly url: string;
  readonly version: string;
  readonly license: string;
}

export interface SourceSetImportManifest {
  readonly sourceSet: SourceSet;
  readonly sourceSetVersionId: SourceSetVersion['versionId'];
  readonly entryCount: number;
  readonly upstreams: readonly SourceSetUpstreamReference[];
  readonly normalizationNotes: readonly string[];
}

export interface AssignmentVersionSource {
  readonly sourceSet: SourceSet;
  readonly sourceSetVersionId: SourceSetVersion['versionId'];
}

export interface AssignmentVersion {
  readonly id: string;
  readonly sourceSetVersions: readonly AssignmentVersionSource[];
  readonly strategyId: string;
  readonly codeSpaceSize: number;
  readonly description: string;
}

export interface ContentDeckManifest {
  readonly id: string;
  readonly label: string;
  readonly sourceSetPriority: readonly CanonicalSourceSet[];
  readonly sourceSetVersions: readonly SourceSetVersion[];
  readonly sourceImportManifests: readonly SourceSetImportManifest[];
  readonly assignmentVersion: AssignmentVersion;
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
  readonly sourceSetVersionId: SourceSetVersion['versionId'];
  readonly assignmentVersionId: AssignmentVersion['id'];
  readonly code: KanjiCode;
  readonly meanings: readonly string[];
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
  readonly tags: readonly string[];
  readonly metadata?: KanjiMetadata;
}
