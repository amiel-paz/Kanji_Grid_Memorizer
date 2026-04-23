import { describe, expect, it } from 'vitest';
import {
  canonicalAssignmentVersion,
  canonicalDeckManifest,
  canonicalKanjiDeck,
} from '../src/data/canonicalDeck';
import {
  jinmeiyoImportManifest,
  jinmeiyoSourceVersion,
} from '../src/data/canonicalSources/jinmeiyo/kanjidic2_2026_112';
import { joyoImportManifest, joyoSourceVersion } from '../src/data/canonicalSources/joyo/kanjidic2_2026_112';
import { SOURCE_SET_IDS } from '../src/domain/content/types';
import { KANJI_CODE_SPACE_SIZE, base8StablePermutationAssignment } from '../src/domain/encoding/assignment';

describe('canonical deck', () => {
  it('materializes the real app deck from explicit Joyo and Jinmeiyo source inputs', () => {
    expect(canonicalKanjiDeck).toHaveLength(2999);
    expect(canonicalKanjiDeck.filter((entry) => entry.sourceSet === SOURCE_SET_IDS.JOYO)).toHaveLength(2136);
    expect(canonicalKanjiDeck.filter((entry) => entry.sourceSet === SOURCE_SET_IDS.JINMEIYO)).toHaveLength(863);
    expect(canonicalKanjiDeck.slice(0, 2136).every((entry) => entry.sourceSetVersionId === joyoSourceVersion.versionId)).toBe(
      true,
    );
    expect(canonicalKanjiDeck.slice(2136).every((entry) => entry.sourceSetVersionId === jinmeiyoSourceVersion.versionId)).toBe(
      true,
    );
    expect(
      canonicalKanjiDeck.every(
        (entry) => entry.assignmentVersionId === canonicalAssignmentVersion.id,
      ),
    ).toBe(true);
    expect(canonicalKanjiDeck.every((entry) => !entry.tags.includes('mock'))).toBe(true);
    expect(canonicalKanjiDeck[0]?.canonicalIndex).toBe(1);
    expect(canonicalKanjiDeck.at(-1)?.canonicalIndex).toBe(2999);
  });

  it('proves the app deck is no longer a tiny hand-entered starter slice and now includes the full real Jinmeiyo set', () => {
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '亜')).toMatchObject({
      canonicalIndex: 1,
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoSourceVersion.versionId,
      tags: ['joyo', 'grade-8'],
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '娃')).toMatchObject({
      canonicalIndex: 2137,
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
      tags: ['jinmeiyo', 'grade-9'],
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '瀧')).toMatchObject({
      canonicalIndex: 2455,
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
      tags: ['jinmeiyo', 'grade-10', 'variant'],
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '響')).toMatchObject({
      canonicalIndex: 2999,
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
      tags: ['jinmeiyo', 'grade-10', 'variant'],
    });
  });

  it('keeps canonical source provenance and Joyo-first expansion rules explicit', () => {
    expect(canonicalDeckManifest).toMatchObject({
      id: 'canonical-content-v2',
      label: 'Joyo-first canonical deck with full Jinmeiyo supplemental import',
      sourceSetPriority: [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO],
      assignmentVersion: canonicalAssignmentVersion,
      overlapPolicy: 'higher-priority-source-wins',
    });
    expect(canonicalDeckManifest.sourceSetVersions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceSet: SOURCE_SET_IDS.JOYO,
          versionId: joyoSourceVersion.versionId,
        }),
        expect.objectContaining({
          sourceSet: SOURCE_SET_IDS.JINMEIYO,
          versionId: jinmeiyoSourceVersion.versionId,
        }),
      ]),
    );
    expect(canonicalDeckManifest.sourceImportManifests).toEqual(
      expect.arrayContaining([
        joyoImportManifest,
        jinmeiyoImportManifest,
      ]),
    );
    expect(canonicalDeckManifest.description).toContain('higher-priority-source-wins');
  });

  it('ties the canonical assignment version to the exact imported Joyo and Jinmeiyo source versions', () => {
    expect(canonicalAssignmentVersion).toMatchObject({
      id: 'canonical-joyo-kanjidic2-2026-112-plus-jinmeiyo-kanjidic2-2026-112-assignment-v1',
      sourceSetVersions: expect.arrayContaining([
        {
          sourceSet: SOURCE_SET_IDS.JOYO,
          sourceSetVersionId: joyoSourceVersion.versionId,
        },
        {
          sourceSet: SOURCE_SET_IDS.JINMEIYO,
          sourceSetVersionId: jinmeiyoSourceVersion.versionId,
        },
      ]),
      codeSpaceSize: KANJI_CODE_SPACE_SIZE,
    });
    expect(canonicalAssignmentVersion.description).toContain(joyoSourceVersion.versionId);
    expect(canonicalAssignmentVersion.description).toContain(jinmeiyoSourceVersion.versionId);
  });

  it('derives stable KanjiEntry codes from canonical input records', () => {
    for (const entry of canonicalKanjiDeck) {
      expect(entry.code).toEqual(
        base8StablePermutationAssignment.assignCode({
          canonicalIndex: entry.canonicalIndex,
          assignmentVersion: canonicalAssignmentVersion,
        }),
      );
    }
  });

  it('keeps Joyo as the canonical owner when Jinmeiyo adds related forms', () => {
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '園')).toMatchObject({
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoSourceVersion.versionId,
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '滝')).toMatchObject({
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoSourceVersion.versionId,
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '薗')).toMatchObject({
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '瀧')).toMatchObject({
      sourceSet: SOURCE_SET_IDS.JINMEIYO,
      sourceSetVersionId: jinmeiyoSourceVersion.versionId,
    });
  });
});
