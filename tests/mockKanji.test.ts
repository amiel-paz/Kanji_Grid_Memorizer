import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { assertValidKanjiFixture } from '../src/data/validateKanjiFixture';
import { SOURCE_SET_IDS } from '../src/domain/content/types';
import { base8IndexAssignment, currentAssignmentVersion } from '../src/domain/encoding/assignment';

describe('mock kanji fixture', () => {
  it('passes local fixture validation', () => {
    expect(() => assertValidKanjiFixture(mockKanji)).not.toThrow();
  });

  it('stays a small development-only mock-joyo deck', () => {
    expect(mockKanji.length).toBeGreaterThanOrEqual(10);
    expect(mockKanji.length).toBeLessThanOrEqual(20);

    expect(mockKanji.every((entry) => entry.sourceSet === SOURCE_SET_IDS.MOCK_JOYO)).toBe(true);
    expect(mockKanji.every((entry) => entry.assignmentVersionId === currentAssignmentVersion.id)).toBe(
      true,
    );
    expect(mockKanji.every((entry) => entry.tags.includes('mock'))).toBe(true);
  });

  it('keeps stable literal codes aligned with the placeholder assignment scaffold', () => {
    for (const entry of mockKanji) {
      expect(entry.code).toEqual(
        base8IndexAssignment.assignCode({
          canonicalIndex: entry.canonicalIndex,
          assignmentVersion: currentAssignmentVersion,
        }),
      );
    }
  });

  it('uses unique placeholder indexes and kanji characters', () => {
    expect(new Set(mockKanji.map((entry) => entry.canonicalIndex)).size).toBe(mockKanji.length);
    expect(new Set(mockKanji.map((entry) => entry.kanji)).size).toBe(mockKanji.length);
  });
});
