import { describe, expect, it } from 'vitest';
import { SOURCE_SET_IDS } from '../src/domain/content/types';
import { createBase8StableAssignmentVersion } from '../src/domain/encoding/assignment';
import {
  materializeKanjiEntries,
  type KanjiSourceImport,
} from '../src/data/kanjiSourceMaterialization';

const joyoTestSource: KanjiSourceImport = {
  version: {
    sourceSet: SOURCE_SET_IDS.JOYO,
    versionId: 'joyo-test-v1',
    label: 'Joyo test import',
    provenance: 'Test-only Joyo source.',
    notes: 'Used to verify canonical overlap handling.',
  },
  entries: [
    {
      kanji: '園',
      canonicalIndex: 1,
      meanings: ['garden'],
      onyomi: ['エン'],
      kunyomi: ['その'],
      tags: ['joyo'],
      metadata: { grade: 2 },
    },
    {
      kanji: '滝',
      canonicalIndex: 2,
      meanings: ['waterfall'],
      onyomi: ['ロウ'],
      kunyomi: ['たき'],
      tags: ['joyo'],
      metadata: { grade: 8 },
    },
  ],
};

const jinmeiyoTestSource: KanjiSourceImport = {
  version: {
    sourceSet: SOURCE_SET_IDS.JINMEIYO,
    versionId: 'jinmeiyo-test-v1',
    label: 'Jinmeiyo test import',
    provenance: 'Test-only Jinmeiyo source.',
    notes: 'Used to verify canonical overlap handling.',
  },
  entries: [
    {
      kanji: '園',
      canonicalIndex: 3,
      meanings: ['garden'],
      onyomi: ['エン'],
      kunyomi: ['その'],
      tags: ['jinmeiyo'],
      metadata: { grade: 10 },
    },
    {
      kanji: '瀧',
      canonicalIndex: 4,
      meanings: ['waterfall'],
      onyomi: ['ロウ'],
      kunyomi: ['たき'],
      tags: ['jinmeiyo'],
      metadata: { grade: 10 },
    },
  ],
};

const testAssignmentVersion = createBase8StableAssignmentVersion({
  id: 'joyo-test-v1-plus-jinmeiyo-test-v1-assignment-v1',
  sourceSetVersions: [
    {
      sourceSet: joyoTestSource.version.sourceSet,
      sourceSetVersionId: joyoTestSource.version.versionId,
    },
    {
      sourceSet: jinmeiyoTestSource.version.sourceSet,
      sourceSetVersionId: jinmeiyoTestSource.version.versionId,
    },
  ],
  description: 'Test assignment version for canonical overlap rules.',
});

describe('kanji source materialization', () => {
  it('keeps the higher-priority Joyo owner when Jinmeiyo repeats the same literal', () => {
    const materialized = materializeKanjiEntries({
      sources: [joyoTestSource, jinmeiyoTestSource],
      assignmentVersion: testAssignmentVersion,
      sourceSetPriority: [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO],
    });

    expect(materialized).toHaveLength(3);
    expect(materialized.find((entry) => entry.kanji === '園')).toMatchObject({
      canonicalIndex: 1,
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoTestSource.version.versionId,
    });
    expect(materialized.find((entry) => entry.kanji === '瀧')).toMatchObject({
      canonicalIndex: 4,
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoTestSource.version.versionId,
    });
  });

  it('fails fast on duplicate literals when no canonical priority is provided', () => {
    expect(() =>
      materializeKanjiEntries({
        sources: [joyoTestSource, jinmeiyoTestSource],
        assignmentVersion: testAssignmentVersion,
      }),
    ).toThrow('Provide explicit canonical source priority');
  });

  it('fails if a higher-priority owner appears after a lower-priority source already claimed the literal', () => {
    expect(() =>
      materializeKanjiEntries({
        sources: [jinmeiyoTestSource, joyoTestSource],
        assignmentVersion: testAssignmentVersion,
        sourceSetPriority: [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO],
      }),
    ).toThrow('must be materialized after it and treated as supplemental only');
  });
});
