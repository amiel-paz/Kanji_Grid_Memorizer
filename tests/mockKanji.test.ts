import { describe, expect, it } from 'vitest';
import { mockKanji } from '../src/data/mockKanji';
import { assertValidKanjiFixture } from '../src/data/validateKanjiFixture';
import { SOURCE_SET_DEFINITIONS, SOURCE_SET_IDS } from '../src/domain/content/types';
import {
  base8IndexAssignment,
  currentAssignmentVersion,
  KANJI_CODE_SPACE_SIZE,
  PLACEHOLDER_ASSIGNMENT_STRATEGY_ID,
} from '../src/domain/encoding/assignment';

const EXPECTED_MOCK_ASSIGNMENT_VERSION_ID = 'placeholder-v1';
const EXPECTED_MOCK_CODES = new Map<string, readonly number[]>([
  ['日', [0, 0, 6, 2]],
  ['月', [4, 6, 4, 3]],
  ['火', [1, 4, 2, 4]],
  ['水', [6, 2, 0, 5]],
  ['木', [2, 7, 6, 6]],
  ['山', [7, 5, 4, 7]],
  ['川', [4, 3, 3, 0]],
  ['田', [1, 1, 1, 1]],
  ['人', [5, 6, 7, 2]],
  ['口', [2, 4, 5, 3]],
  ['目', [7, 2, 3, 4]],
  ['耳', [4, 0, 1, 5]],
  ['手', [0, 5, 7, 6]],
  ['足', [5, 3, 5, 7]],
  ['力', [2, 1, 4, 0]],
  ['名', [6, 7, 2, 1]],
]);

describe('mock kanji fixture', () => {
  it('passes local fixture validation', () => {
    expect(() => assertValidKanjiFixture(mockKanji)).not.toThrow();
  });

  it('uses the current placeholder assignment contract for mock-only data', () => {
    expect(currentAssignmentVersion).toMatchObject({
      id: EXPECTED_MOCK_ASSIGNMENT_VERSION_ID,
      sourceSets: [SOURCE_SET_IDS.MOCK_JOYO],
      strategyId: PLACEHOLDER_ASSIGNMENT_STRATEGY_ID,
      codeSpaceSize: KANJI_CODE_SPACE_SIZE,
    });
  });

  it('stays a small development-only mock-joyo deck', () => {
    expect(mockKanji.length).toBeGreaterThanOrEqual(10);
    expect(mockKanji.length).toBeLessThanOrEqual(20);

    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.MOCK_JOYO].ownership).toBe('development-fixture');
    expect(mockKanji.every((entry) => entry.sourceSet === SOURCE_SET_IDS.MOCK_JOYO)).toBe(true);
    expect(
      mockKanji.every(
        (entry) => entry.assignmentVersionId === EXPECTED_MOCK_ASSIGNMENT_VERSION_ID,
      ),
    ).toBe(true);
    expect(mockKanji.every((entry) => entry.tags.includes('mock'))).toBe(true);
  });

  it('keeps required fixture fields populated for each real entry', () => {
    for (const entry of mockKanji) {
      expect(entry.kanji.trim()).not.toBe('');
      expect(entry.meanings.every((meaning) => meaning.trim() !== '')).toBe(true);
      expect(entry.onyomi.every((reading) => reading.trim() !== '')).toBe(true);
      expect(entry.kunyomi.every((reading) => reading.trim() !== '')).toBe(true);
      expect(entry.tags.every((tag) => tag.trim() !== '')).toBe(true);
    }
  });

  it('keeps stable literal codes aligned with the placeholder assignment scaffold', () => {
    for (const entry of mockKanji) {
      expect(entry.code).toEqual(EXPECTED_MOCK_CODES.get(entry.kanji));
      expect(entry.code.every((digit) => Number.isInteger(digit) && digit >= 0 && digit <= 7)).toBe(
        true,
      );
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
    expect(new Set(mockKanji.map((entry) => entry.code.join(''))).size).toBe(mockKanji.length);
  });
});
