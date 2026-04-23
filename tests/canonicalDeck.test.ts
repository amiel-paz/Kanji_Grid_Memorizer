import { describe, expect, it } from 'vitest';
import {
  canonicalDeckManifest,
  canonicalKanjiDeck,
  joyoCanonicalAssignmentVersion,
} from '../src/data/canonicalDeck';
import { jinmeiyoSourceVersion } from '../src/data/canonicalSources/jinmeiyo/emptyReservation';
import { joyoImportManifest, joyoSourceVersion } from '../src/data/canonicalSources/joyo/kanjidic2_2026_112';
import { SOURCE_SET_IDS } from '../src/domain/content/types';
import { KANJI_CODE_SPACE_SIZE, base8StablePermutationAssignment } from '../src/domain/encoding/assignment';

describe('canonical deck', () => {
  it('materializes the real app deck from explicit canonical source inputs', () => {
    expect(canonicalKanjiDeck).toHaveLength(2136);
    expect(canonicalKanjiDeck.every((entry) => entry.sourceSet === SOURCE_SET_IDS.JOYO)).toBe(true);
    expect(canonicalKanjiDeck.every((entry) => entry.sourceSetVersionId === joyoSourceVersion.versionId)).toBe(
      true,
    );
    expect(
      canonicalKanjiDeck.every(
        (entry) => entry.assignmentVersionId === joyoCanonicalAssignmentVersion.id,
      ),
    ).toBe(true);
    expect(canonicalKanjiDeck.every((entry) => !entry.tags.includes('mock'))).toBe(true);
    expect(canonicalKanjiDeck[0]?.canonicalIndex).toBe(1);
    expect(canonicalKanjiDeck.at(-1)?.canonicalIndex).toBe(2136);
  });

  it('proves the app deck is no longer a tiny hand-entered starter slice', () => {
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '亜')).toMatchObject({
      canonicalIndex: 1,
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoSourceVersion.versionId,
      tags: ['joyo', 'grade-8'],
    });
    expect(canonicalKanjiDeck.find((entry) => entry.kanji === '剝')).toMatchObject({
      canonicalIndex: 2136,
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: joyoSourceVersion.versionId,
      tags: ['joyo', 'grade-8'],
    });
  });

  it('keeps canonical source provenance and Joyo-first expansion rules explicit', () => {
    expect(canonicalDeckManifest).toMatchObject({
      id: 'canonical-content-v1',
      label: 'Full Joyo canonical deck',
      sourceSetPriority: [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO],
      assignmentVersion: joyoCanonicalAssignmentVersion,
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
        expect.objectContaining({
          sourceSet: SOURCE_SET_IDS.JINMEIYO,
          sourceSetVersionId: jinmeiyoSourceVersion.versionId,
          entryCount: 0,
        }),
      ]),
    );
    expect(canonicalDeckManifest.description).toContain('full imported Joyo source-set version first');
  });

  it('ties the canonical assignment version to the imported Joyo source version', () => {
    expect(joyoCanonicalAssignmentVersion).toMatchObject({
      id: 'joyo-kanjidic2-2026-112-assignment-v1',
      sourceSetVersions: [
        {
          sourceSet: SOURCE_SET_IDS.JOYO,
          sourceSetVersionId: joyoSourceVersion.versionId,
        },
      ],
      codeSpaceSize: KANJI_CODE_SPACE_SIZE,
    });
    expect(joyoCanonicalAssignmentVersion.description).toContain(joyoSourceVersion.versionId);
  });

  it('derives stable KanjiEntry codes from canonical input records', () => {
    for (const entry of canonicalKanjiDeck) {
      expect(entry.code).toEqual(
        base8StablePermutationAssignment.assignCode({
          canonicalIndex: entry.canonicalIndex,
          assignmentVersion: joyoCanonicalAssignmentVersion,
        }),
      );
    }
  });
});
