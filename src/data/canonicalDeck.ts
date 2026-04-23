import { CANONICAL_SOURCE_SET_PRIORITY, type ContentDeckManifest } from '../domain/content/types';
import { createBase8StableAssignmentVersion } from '../domain/encoding/assignment';
import { jinmeiyoImportManifest, jinmeiyoSourceImport, jinmeiyoSourceVersion } from './canonicalSources/jinmeiyo/emptyReservation';
import { joyoImportManifest, joyoSourceImport, joyoSourceVersion } from './canonicalSources/joyo/kanjidic2_2026_112';
import { materializeKanjiEntries } from './kanjiSourceMaterialization';

export const joyoCanonicalAssignmentVersion = createBase8StableAssignmentVersion({
  id: 'joyo-kanjidic2-2026-112-assignment-v1',
  sourceSetVersions: [
    {
      sourceSet: joyoSourceVersion.sourceSet,
      sourceSetVersionId: joyoSourceVersion.versionId,
    },
  ],
  description:
    'Stable base-8 permutation assignment for the full imported Joyo source-set version joyo-kanjidic2-2026-112. Jinmeiyo is still excluded from this assignment version.',
});

export const canonicalDeckManifest: ContentDeckManifest = {
  id: 'canonical-content-v1',
  label: 'Full Joyo canonical deck',
  sourceSetPriority: CANONICAL_SOURCE_SET_PRIORITY,
  sourceSetVersions: [joyoSourceVersion, jinmeiyoSourceVersion],
  sourceImportManifests: [joyoImportManifest, jinmeiyoImportManifest],
  assignmentVersion: joyoCanonicalAssignmentVersion,
  description:
    'Materialize stable KanjiEntry records from the full imported Joyo source-set version first, then add Jinmeiyo only through its own explicit versioned source path.',
};

export const canonicalKanjiDeck = materializeKanjiEntries({
  sources: [joyoSourceImport, jinmeiyoSourceImport],
  assignmentVersion: joyoCanonicalAssignmentVersion,
});
