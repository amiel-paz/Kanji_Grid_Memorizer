import { CANONICAL_SOURCE_SET_PRIORITY, type ContentDeckManifest } from '../domain/content/types';
import { createBase8StableAssignmentVersion } from '../domain/encoding/assignment';
import {
  jinmeiyoImportManifest,
  jinmeiyoSourceImport,
  jinmeiyoSourceVersion,
} from './canonicalSources/jinmeiyo/kanjidic2_2026_112';
import { joyoImportManifest, joyoSourceImport, joyoSourceVersion } from './canonicalSources/joyo/kanjidic2_2026_112';
import { materializeKanjiEntries } from './kanjiSourceMaterialization';

export const canonicalAssignmentVersion = createBase8StableAssignmentVersion({
  id: 'canonical-joyo-kanjidic2-2026-112-plus-jinmeiyo-kanjidic2-2026-112-assignment-v1',
  sourceSetVersions: [
    {
      sourceSet: joyoSourceVersion.sourceSet,
      sourceSetVersionId: joyoSourceVersion.versionId,
    },
    {
      sourceSet: jinmeiyoSourceVersion.sourceSet,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
    },
  ],
  description:
    'Stable base-8 permutation assignment for the imported Joyo source-set version joyo-kanjidic2-2026-112 plus the explicit full Jinmeiyo supplemental source-set version jinmeiyo-kanjidic2-2026-112. Joyo remains the canonical owner for overlaps.',
});

export const canonicalDeckManifest: ContentDeckManifest = {
  id: 'canonical-content-v2',
  label: 'Joyo-first canonical deck with full Jinmeiyo supplemental import',
  sourceSetPriority: CANONICAL_SOURCE_SET_PRIORITY,
  sourceSetVersions: [joyoSourceVersion, jinmeiyoSourceVersion],
  sourceImportManifests: [joyoImportManifest, jinmeiyoImportManifest],
  assignmentVersion: canonicalAssignmentVersion,
  overlapPolicy: 'higher-priority-source-wins',
  description:
    'Materialize stable KanjiEntry records from the full imported Joyo source-set version first, then append the full explicit Jinmeiyo supplemental import under a higher-priority-source-wins ownership rule.',
};

export const canonicalKanjiDeck = materializeKanjiEntries({
  sources: [joyoSourceImport, jinmeiyoSourceImport],
  assignmentVersion: canonicalAssignmentVersion,
  sourceSetPriority: CANONICAL_SOURCE_SET_PRIORITY,
});
