import {
  CANONICAL_SOURCE_SET_PRIORITY,
  SOURCE_SET_IDS,
  type ContentDeckManifest,
  type SourceSetVersion,
} from '../domain/content/types';
import { createBase8StableAssignmentVersion } from '../domain/encoding/assignment';
import { materializeKanjiEntries, type KanjiSourceImport } from './kanjiSourceMaterialization';

const joyoSourceVersion: SourceSetVersion = {
  sourceSet: SOURCE_SET_IDS.JOYO,
  versionId: 'joyo-manual-extract-v1',
  label: 'Joyo manual extract v1',
  provenance:
    'Small in-repo source extract curated for this repository. This is the current real deck source, not a mock fixture.',
  notes:
    'Intentionally reviewable rather than complete. The purpose of this pass is to make the canonical data boundary explicit before broader source coverage exists.',
};

const jinmeiyoSourceVersion: SourceSetVersion = {
  sourceSet: SOURCE_SET_IDS.JINMEIYO,
  versionId: 'jinmeiyo-empty-reservation-v1',
  label: 'Jinmeiyo empty reservation v1',
  provenance:
    'Explicit in-repo reservation for the second canonical source-set path. This file intentionally contains no entries in the current pass.',
  notes:
    'Keeping Jinmeiyo empty here prevents silent reclassification of common-use entries while the second import remains a separate follow-on step.',
};

const joyoSourceImport: KanjiSourceImport = {
  version: joyoSourceVersion,
  entries: [
    {
      kanji: '日',
      canonicalIndex: 1,
      meanings: ['sun', 'day'],
      onyomi: ['ニチ', 'ジツ'],
      kunyomi: ['ひ', 'か'],
      tags: ['joyo', 'starter', 'nature', 'time'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '月',
      canonicalIndex: 2,
      meanings: ['moon', 'month'],
      onyomi: ['ゲツ', 'ガツ'],
      kunyomi: ['つき'],
      tags: ['joyo', 'starter', 'nature', 'time'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '火',
      canonicalIndex: 3,
      meanings: ['fire'],
      onyomi: ['カ'],
      kunyomi: ['ひ'],
      tags: ['joyo', 'starter', 'element'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '水',
      canonicalIndex: 4,
      meanings: ['water'],
      onyomi: ['スイ'],
      kunyomi: ['みず'],
      tags: ['joyo', 'starter', 'element'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '木',
      canonicalIndex: 5,
      meanings: ['tree', 'wood'],
      onyomi: ['モク', 'ボク'],
      kunyomi: ['き', 'こ'],
      tags: ['joyo', 'starter', 'nature'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '山',
      canonicalIndex: 6,
      meanings: ['mountain'],
      onyomi: ['サン'],
      kunyomi: ['やま'],
      tags: ['joyo', 'starter', 'nature', 'place'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '川',
      canonicalIndex: 7,
      meanings: ['river'],
      onyomi: ['セン'],
      kunyomi: ['かわ'],
      tags: ['joyo', 'starter', 'nature', 'place'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '田',
      canonicalIndex: 8,
      meanings: ['rice field'],
      onyomi: ['デン'],
      kunyomi: ['た'],
      tags: ['joyo', 'starter', 'place', 'food'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '人',
      canonicalIndex: 9,
      meanings: ['person'],
      onyomi: ['ジン', 'ニン'],
      kunyomi: ['ひと'],
      tags: ['joyo', 'starter', 'people'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '口',
      canonicalIndex: 10,
      meanings: ['mouth', 'opening'],
      onyomi: ['コウ', 'ク'],
      kunyomi: ['くち'],
      tags: ['joyo', 'starter', 'body', 'shape'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '目',
      canonicalIndex: 11,
      meanings: ['eye'],
      onyomi: ['モク', 'ボク'],
      kunyomi: ['め', 'ま'],
      tags: ['joyo', 'starter', 'body'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '耳',
      canonicalIndex: 12,
      meanings: ['ear'],
      onyomi: ['ジ'],
      kunyomi: ['みみ'],
      tags: ['joyo', 'starter', 'body'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '手',
      canonicalIndex: 13,
      meanings: ['hand'],
      onyomi: ['シュ'],
      kunyomi: ['て', 'た'],
      tags: ['joyo', 'starter', 'body', 'action'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '足',
      canonicalIndex: 14,
      meanings: ['foot', 'leg', 'enough'],
      onyomi: ['ソク'],
      kunyomi: ['あし', 'た.りる'],
      tags: ['joyo', 'body', 'action'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '力',
      canonicalIndex: 15,
      meanings: ['power', 'strength'],
      onyomi: ['リョク', 'リキ'],
      kunyomi: ['ちから'],
      tags: ['joyo', 'action', 'quality'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
    {
      kanji: '名',
      canonicalIndex: 16,
      meanings: ['name', 'reputation'],
      onyomi: ['メイ', 'ミョウ'],
      kunyomi: ['な'],
      tags: ['joyo', 'people', 'identity'],
      metadata: { grade: 1, jlptLevel: 'N5' },
    },
  ],
};

const jinmeiyoSourceImport: KanjiSourceImport = {
  version: jinmeiyoSourceVersion,
  entries: [],
};

export const joyoCanonicalAssignmentVersion = createBase8StableAssignmentVersion({
  id: 'joyo-manual-extract-assignment-v1',
  sourceSetVersions: [
    {
      sourceSet: joyoSourceVersion.sourceSet,
      sourceSetVersionId: joyoSourceVersion.versionId,
    },
  ],
  description:
    'Stable base-8 permutation assignment for the current Joyo canonical extract. Jinmeiyo is not part of this assignment version yet.',
});

export const canonicalDeckManifest: ContentDeckManifest = {
  id: 'canonical-content-v1',
  label: 'Joyo-first canonical deck',
  sourceSetPriority: CANONICAL_SOURCE_SET_PRIORITY,
  sourceSetVersions: [joyoSourceVersion, jinmeiyoSourceVersion],
  assignmentVersion: joyoCanonicalAssignmentVersion,
  description:
    'Materialize stable KanjiEntry records from the Joyo import first, then add Jinmeiyo only through its own explicit versioned source path.',
};

export const canonicalKanjiDeck = materializeKanjiEntries({
  sources: [joyoSourceImport, jinmeiyoSourceImport],
  assignmentVersion: joyoCanonicalAssignmentVersion,
});
