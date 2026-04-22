import type {
  AssignmentVersion,
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
}: {
  readonly sources: readonly KanjiSourceImport[];
  readonly assignmentVersion: AssignmentVersion;
}): readonly KanjiEntry[] {
  const entries: KanjiEntry[] = [];
  const ownerByKanji = new Map<string, SourceSetVersion>();
  const kanjiByCanonicalIndex = new Map<number, string>();

  for (const source of sources) {
    for (const record of source.entries) {
      assertAssignmentVersionSupportsSource(source.version, assignmentVersion, record.kanji);

      const existingOwner = ownerByKanji.get(record.kanji);
      if (existingOwner) {
        throw new Error(
          `Duplicate canonical kanji ${record.kanji} appears in ${source.version.sourceSet} after ${existingOwner.sourceSet}. Resolve overlap before materialization so Joyo-first ownership stays explicit.`,
        );
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
