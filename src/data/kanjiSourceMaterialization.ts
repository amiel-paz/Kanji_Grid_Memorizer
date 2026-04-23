import type {
  AssignmentVersion,
  CanonicalSourceSet,
  KanjiEntry,
  KanjiMetadata,
  SourceSetVersion,
} from '../domain/content/types';
import { base8StablePermutationAssignment } from '../domain/encoding/assignment';

export interface KanjiSourceRecord {
  readonly kanji: string;
  readonly canonicalIndex: number;
  readonly meanings: readonly string[];
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
  readonly tags: readonly string[];
  readonly metadata?: KanjiMetadata;
}

export interface KanjiSourceImport {
  readonly version: SourceSetVersion;
  readonly entries: readonly KanjiSourceRecord[];
}

export function materializeKanjiEntries({
  sources,
  assignmentVersion,
  sourceSetPriority,
}: {
  readonly sources: readonly KanjiSourceImport[];
  readonly assignmentVersion: AssignmentVersion;
  readonly sourceSetPriority?: readonly CanonicalSourceSet[];
}): readonly KanjiEntry[] {
  const entries: KanjiEntry[] = [];
  const ownerByKanji = new Map<string, SourceSetVersion>();
  const kanjiByCanonicalIndex = new Map<number, string>();
  const sourcePriority = new Map(
    sourceSetPriority?.map((sourceSet, index) => [sourceSet, index]) ?? [],
  );

  for (const source of sources) {
    for (const record of source.entries) {
      assertAssignmentVersionSupportsSource(source.version, assignmentVersion, record.kanji);

      const existingOwner = ownerByKanji.get(record.kanji);
      if (existingOwner) {
        if (
          shouldKeepExistingOwner({
            existingOwner,
            incomingOwner: source.version,
            kanji: record.kanji,
            sourcePriority,
          })
        ) {
          continue;
        }
      }

      const existingKanji = kanjiByCanonicalIndex.get(record.canonicalIndex);
      if (existingKanji) {
        throw new Error(
          `canonicalIndex ${record.canonicalIndex} is already assigned to ${existingKanji}. Imported source data must keep canonical indexes unique across the materialized deck.`,
        );
      }

      entries.push({
        ...record,
        sourceSet: source.version.sourceSet,
        sourceSetVersionId: source.version.versionId,
        assignmentVersionId: assignmentVersion.id,
        code: base8StablePermutationAssignment.assignCode({
          canonicalIndex: record.canonicalIndex,
          assignmentVersion,
        }),
      });

      ownerByKanji.set(record.kanji, source.version);
      kanjiByCanonicalIndex.set(record.canonicalIndex, record.kanji);
    }
  }

  return [...entries].sort((left, right) => left.canonicalIndex - right.canonicalIndex);
}

function assertAssignmentVersionSupportsSource(
  sourceVersion: SourceSetVersion,
  assignmentVersion: AssignmentVersion,
  kanji: string,
): void {
  const supportsSource = assignmentVersion.sourceSetVersions.some(
    (source) =>
      source.sourceSet === sourceVersion.sourceSet &&
      source.sourceSetVersionId === sourceVersion.versionId,
  );

  if (!supportsSource) {
    throw new Error(
      `Assignment version ${assignmentVersion.id} does not include ${sourceVersion.sourceSet}@${sourceVersion.versionId}, so ${kanji} cannot be materialized against it.`,
    );
  }
}

function shouldKeepExistingOwner({
  existingOwner,
  incomingOwner,
  kanji,
  sourcePriority,
}: {
  readonly existingOwner: SourceSetVersion;
  readonly incomingOwner: SourceSetVersion;
  readonly kanji: string;
  readonly sourcePriority: ReadonlyMap<CanonicalSourceSet, number>;
}): boolean {
  if (incomingOwner.sourceSet === existingOwner.sourceSet) {
    throw new Error(
      `Duplicate canonical kanji ${kanji} appears more than once in ${incomingOwner.sourceSet}@${incomingOwner.versionId}. Imported source data must deduplicate within one source set before materialization.`,
    );
  }

  if (sourcePriority.size === 0) {
    throw new Error(
      `Duplicate canonical kanji ${kanji} appears in ${incomingOwner.sourceSet} after ${existingOwner.sourceSet}. Provide explicit canonical source priority to preserve ownership boundaries.`,
    );
  }

  const existingPriority = sourcePriority.get(existingOwner.sourceSet as CanonicalSourceSet);
  const incomingPriority = sourcePriority.get(incomingOwner.sourceSet as CanonicalSourceSet);

  if (existingPriority === undefined || incomingPriority === undefined) {
    throw new Error(
      `Duplicate canonical kanji ${kanji} cannot be resolved because ${existingOwner.sourceSet} or ${incomingOwner.sourceSet} is missing from the canonical source priority list.`,
    );
  }

  if (incomingPriority > existingPriority) {
    return true;
  }

  if (incomingPriority < existingPriority) {
    throw new Error(
      `Canonical kanji ${kanji} is owned by higher-priority ${incomingOwner.sourceSet}@${incomingOwner.versionId}, so ${existingOwner.sourceSet}@${existingOwner.versionId} must be materialized after it and treated as supplemental only.`,
    );
  }

  throw new Error(
    `Canonical kanji ${kanji} appears in multiple source sets at the same priority, so ownership must be resolved explicitly before materialization.`,
  );
}
