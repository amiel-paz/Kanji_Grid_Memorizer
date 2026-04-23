import {
  SOURCE_SET_IDS,
  type SourceSetImportManifest,
  type SourceSetVersion,
} from '../../../domain/content/types';
import type { KanjiSourceImport, KanjiSourceRecord } from '../../kanjiSourceMaterialization';

// Generated from KANJIDIC2 database version 2026-112 (created 2026-04-22).

export const jinmeiyoSourceVersion: SourceSetVersion = {
  sourceSet: SOURCE_SET_IDS.JINMEIYO,
  versionId: 'jinmeiyo-kanjidic2-2026-112-subset-v1',
  label: 'Jinmeiyo subset import from KANJIDIC2 2026-112',
  provenance:
    'Reviewable initial Jinmeiyo supplemental import materialized from KANJIDIC2 database version 2026-112 (created 2026-04-22) by selecting a small hand-reviewed subset of grade 9 and grade 10 entries.',
  notes:
    'canonicalIndex continues after the 2136-entry Joyo deck so common-use Joyo ownership and code assignments stay stable while Jinmeiyo arrives as an explicit second source path.',
};

export const jinmeiyoImportManifest: SourceSetImportManifest = {
  sourceSet: jinmeiyoSourceVersion.sourceSet,
  sourceSetVersionId: jinmeiyoSourceVersion.versionId,
  entryCount: 12,
  upstreams: [
    {
      label: 'KANJIDIC2 XML',
      url: 'https://www.edrdg.org/kanjidic/kanjidic2.xml.gz',
      version: '2026-112 (created 2026-04-22)',
      license: 'CC BY-SA 4.0',
    },
  ],
  normalizationNotes: [
    'Select a hand-reviewed initial subset of 12 Jinmeiyo entries from KANJIDIC2 records whose grade is 9 or 10, keeping the second source path explicit and reviewable before a future full import pass.',
    'Preserve the selected subset order from KANJIDIC2 and offset canonicalIndex after the 2136 imported Joyo entries so expanding the source set does not reshuffle Joyo-owned code assignments.',
    'Keep only English meanings from KANJIDIC2 meaning tags and preserve ja_on / ja_kun readings in source order with per-entry deduplication.',
    'Emit minimal canonical tags of jinmeiyo plus grade-N, adding variant only for grade-10 forms so Jinmeiyo stays supplemental without reclassifying the corresponding Joyo forms.',
  ],
};

export const jinmeiyoSourceRecords: readonly KanjiSourceRecord[] = [
  {
    kanji: '丑',
    canonicalIndex: 2137,
    meanings: ['sign of the ox or cow', '1-3AM', 'second sign of Chinese zodiac'],
    onyomi: ['チュウ'],
    kunyomi: ['うし'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '薗',
    canonicalIndex: 2138,
    meanings: ['garden', 'yard', 'farm'],
    onyomi: ['エン', 'オン'],
    kunyomi: ['その'],
    tags: ['jinmeiyo', 'grade-10', 'variant'],
    metadata: { grade: 10 },
  },
  {
    kanji: '椛',
    canonicalIndex: 2139,
    meanings: ['autumn foliage', 'birch', 'maple', '(kokuji)'],
    onyomi: [],
    kunyomi: ['かば', 'もみじ'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '匡',
    canonicalIndex: 2140,
    meanings: ['correct', 'save', 'assist'],
    onyomi: ['キョウ', 'オウ'],
    kunyomi: ['すく.う', 'ただ.す'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '晃',
    canonicalIndex: 2141,
    meanings: ['clear'],
    onyomi: ['コウ'],
    kunyomi: ['あきらか'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '哉',
    canonicalIndex: 2142,
    meanings: ['how', 'what', 'alas', 'question mark', 'exclamation mark'],
    onyomi: ['サイ'],
    kunyomi: ['かな', 'や'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '丞',
    canonicalIndex: 2143,
    meanings: ['help'],
    onyomi: ['ジョウ', 'ショウ'],
    kunyomi: ['すく.う', 'たす.ける'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '瀧',
    canonicalIndex: 2144,
    meanings: ['waterfall', 'rapids', 'cascade'],
    onyomi: ['ロウ', 'ソウ'],
    kunyomi: ['たき'],
    tags: ['jinmeiyo', 'grade-10', 'variant'],
    metadata: { grade: 10 },
  },
  {
    kanji: '乃',
    canonicalIndex: 2145,
    meanings: ['from', 'possessive particle', 'whereupon', 'accordingly'],
    onyomi: ['ナイ', 'ダイ', 'ノ', 'アイ'],
    kunyomi: ['の', 'すなわ.ち', 'なんじ'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '之',
    canonicalIndex: 2146,
    meanings: ['of', 'this'],
    onyomi: ['シ'],
    kunyomi: ['の', 'これ', 'ゆく', 'この'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '亘',
    canonicalIndex: 2147,
    meanings: ['span', 'range', 'extend over'],
    onyomi: ['コウ', 'カン', 'セン'],
    kunyomi: ['わた.る', 'もと.める'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
  {
    kanji: '凜',
    canonicalIndex: 2148,
    meanings: ['cold', 'strict', 'severe'],
    onyomi: ['リン'],
    kunyomi: ['きびし.い'],
    tags: ['jinmeiyo', 'grade-9'],
    metadata: { grade: 9 },
  },
];

export const jinmeiyoSourceImport: KanjiSourceImport = {
  version: jinmeiyoSourceVersion,
  entries: jinmeiyoSourceRecords,
};
