import { describe, expect, it } from 'vitest';
import {
  canonicalDeckManifest,
  canonicalKanjiDeck,
  joyoCanonicalAssignmentVersion,
} from '../src/data/canonicalDeck';
import { SOURCE_SET_IDS } from '../src/domain/content/types';
import { KANJI_CODE_SPACE_SIZE, base8StablePermutationAssignment } from '../src/domain/encoding/assignment';

describe('canonical deck', () => {
  it('materializes the real app deck from explicit canonical source inputs', () => {
    expect(canonicalKanjiDeck.length).toBeGreaterThanOrEqual(10);
    expect(canonicalKanjiDeck.every((entry) => entry.sourceSet === SOURCE_SET_IDS.JOYO)).toBe(true);
    expect(canonicalKanjiDeck.every((entry) => entry.sourceSetVersionId === 'joyo-manual-extract-v1')).toBe(
      true,
    );
    expect(
      canonicalKanjiDeck.every(
        (entry) => entry.assignmentVersionId === joyoCanonicalAssignmentVersion.id,
      ),
    ).toBe(true);
    expect(canonicalKanjiDeck.every((entry) => !entry.tags.includes('mock'))).toBe(true);
  });

  it('keeps canonical source provenance and Joyo-first expansion rules explicit', () => {
    expect(canonicalDeckManifest).toMatchObject({
      id: 'canonical-content-v1',
      label: 'Joyo-first canonical deck',
      sourceSetPriority: [SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO],
      assignmentVersion: joyoCanonicalAssignmentVersion,
    });
    expect(canonicalDeckManifest.sourceSetVersions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceSet: SOURCE_SET_IDS.JOYO,
          versionId: 'joyo-manual-extract-v1',
        }),
        expect.objectContaining({
          sourceSet: SOURCE_SET_IDS.JINMEIYO,
          versionId: 'jinmeiyo-empty-reservation-v1',
        }),
      ]),
    );
    expect(canonicalDeckManifest.description).toContain('Joyo import first');
  });

  it('ties the canonical assignment version to the imported Joyo source version', () => {
    expect(joyoCanonicalAssignmentVersion).toMatchObject({
      id: 'joyo-manual-extract-assignment-v1',
      sourceSetVersions: [
        {
          sourceSet: SOURCE_SET_IDS.JOYO,
          sourceSetVersionId: 'joyo-manual-extract-v1',
        },
      ],
      codeSpaceSize: KANJI_CODE_SPACE_SIZE,
    });
    expect(joyoCanonicalAssignmentVersion.description).toContain('Jinmeiyo is not part');
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
