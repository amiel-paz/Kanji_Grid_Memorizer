import { SOURCE_SET_IDS, type SourceSetImportManifest, type SourceSetVersion } from '../../../domain/content/types';
import type { KanjiSourceImport } from '../../kanjiSourceMaterialization';

export const jinmeiyoSourceVersion: SourceSetVersion = {
  sourceSet: SOURCE_SET_IDS.JINMEIYO,
  versionId: 'jinmeiyo-empty-reservation-v1',
  label: 'Jinmeiyo empty reservation v1',
  provenance:
    'Explicit in-repo reservation for the second canonical source-set path. This file intentionally contains no entries in the current pass.',
  notes:
    'Keeping Jinmeiyo empty here prevents silent reclassification of common-use entries while the second import remains a separate follow-on step.',
};

export const jinmeiyoImportManifest: SourceSetImportManifest = {
  sourceSet: jinmeiyoSourceVersion.sourceSet,
  sourceSetVersionId: jinmeiyoSourceVersion.versionId,
  entryCount: 0,
  upstreams: [],
  normalizationNotes: [
    'This reservation intentionally materializes zero records until the separate Jinmeiyo import worktree lands.',
  ],
};

export const jinmeiyoSourceImport: KanjiSourceImport = {
  version: jinmeiyoSourceVersion,
  entries: [],
};
