import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SOURCE_SET_PRIORITY,
  SOURCE_SET_DEFINITIONS,
  SOURCE_SET_IDS,
} from '../src/domain/content/types';
import {
  BASE8_STABLE_PERMUTATION_STRATEGY_ID,
  base8StablePermutationAssignment,
  createBase8StableAssignmentVersion,
  KANJI_CODE_SPACE_SIZE,
} from '../src/domain/encoding/assignment';
import {
  assertKanjiCode,
  BASE8_COLORS,
  CODE_DIGITS,
  createKanjiCode,
  formatKanjiCode,
  getColorForCodeDigit,
  getKanjiCodeCells,
  isCodeDigit,
  KANJI_CODE_POSITIONS,
} from '../src/domain/encoding/palette';

const testAssignmentVersion = createBase8StableAssignmentVersion({
  id: 'test-assignment-v1',
  sourceSetVersions: [
    {
      sourceSet: SOURCE_SET_IDS.JOYO,
      sourceSetVersionId: 'joyo-test-v1',
    },
  ],
  description: 'Test-only stable assignment version.',
});

describe('base-8 code assignment', () => {
  it('defines exactly eight color digits', () => {
    expect(CODE_DIGITS).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(BASE8_COLORS).toHaveLength(CODE_DIGITS.length);
  });

  it('formats four base-8 digits as a compact code string', () => {
    expect(formatKanjiCode([0, 1, 2, 7])).toBe('0127');
  });

  it('accepts only the defined base-8 digits and maps them to stable colors', () => {
    expect(isCodeDigit(0)).toBe(true);
    expect(isCodeDigit(7)).toBe(true);
    expect(isCodeDigit(-1)).toBe(false);
    expect(isCodeDigit(8)).toBe(false);
    expect(getColorForCodeDigit(5)).toBe(BASE8_COLORS[5]);
  });

  it('rejects malformed kanji codes', () => {
    expect(() => assertKanjiCode([0, 1, 2])).toThrow(
      'A kanji color code must contain exactly four base-8 digits.',
    );
    expect(() => assertKanjiCode([0, 1, 2, 8])).toThrow(
      'A kanji color code must contain exactly four base-8 digits.',
    );
  });

  it('maps code digits to cells in reading order', () => {
    expect(KANJI_CODE_POSITIONS).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
    expect(getKanjiCodeCells([0, 1, 2, 3])).toEqual([
      { position: 'top-left', digit: 0, color: BASE8_COLORS[0] },
      { position: 'top-right', digit: 1, color: BASE8_COLORS[1] },
      { position: 'bottom-left', digit: 2, color: BASE8_COLORS[2] },
      { position: 'bottom-right', digit: 3, color: BASE8_COLORS[3] },
    ]);
  });

  it('creates validated kanji codes without changing the digit order', () => {
    expect(createKanjiCode([7, 6, 5, 4])).toEqual([7, 6, 5, 4]);
  });

  it('publishes explicit stable assignment version metadata', () => {
    expect(testAssignmentVersion).toMatchObject({
      id: 'test-assignment-v1',
      sourceSetVersions: [
        {
          sourceSet: SOURCE_SET_IDS.JOYO,
          sourceSetVersionId: 'joyo-test-v1',
        },
      ],
      strategyId: BASE8_STABLE_PERMUTATION_STRATEGY_ID,
      codeSpaceSize: 4096,
    });
    expect(testAssignmentVersion.description).toContain('stable assignment');
    expect(KANJI_CODE_SPACE_SIZE).toBe(4096);
  });

  it('keeps mock and future canonical source ownership explicit', () => {
    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.MOCK_JOYO]).toMatchObject({
      ownership: 'development-fixture',
    });
    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.MOCK_JOYO].description).toContain(
      'not canonical Joyo data',
    );
    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.JOYO]).toMatchObject({
      ownership: 'canonical-import',
    });
    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.JINMEIYO]).toMatchObject({
      ownership: 'canonical-import',
    });
    expect(CANONICAL_SOURCE_SET_PRIORITY).toEqual([SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO]);
  });

  it('deterministically derives varied digits from canonical index', () => {
    const firstAssignment = base8StablePermutationAssignment.assignCode({
      canonicalIndex: 65,
      assignmentVersion: testAssignmentVersion,
    });
    const secondAssignment = base8StablePermutationAssignment.assignCode({
      canonicalIndex: 65,
      assignmentVersion: testAssignmentVersion,
    });

    expect(firstAssignment).toEqual([6, 1, 6, 2]);
    expect(secondAssignment).toEqual(firstAssignment);
  });

  it('maps the full code space as a stable permutation', () => {
    const assignedCodes = new Set<string>();

    for (let canonicalIndex = 0; canonicalIndex < KANJI_CODE_SPACE_SIZE; canonicalIndex += 1) {
      assignedCodes.add(
        formatKanjiCode(
          base8StablePermutationAssignment.assignCode({
            canonicalIndex,
            assignmentVersion: testAssignmentVersion,
          }),
        ),
      );
    }

    expect(assignedCodes.size).toBe(KANJI_CODE_SPACE_SIZE);
  });

  it('wraps canonical indexes through the stable four-digit permutation', () => {
    expect(
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: 4095,
        assignmentVersion: testAssignmentVersion,
      }),
    ).toEqual([6, 5, 2, 0]);

    expect(
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: 4096,
        assignmentVersion: testAssignmentVersion,
      }),
    ).toEqual([3, 3, 0, 1]);

    expect(
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: 4097,
        assignmentVersion: testAssignmentVersion,
      }),
    ).toEqual([0, 0, 6, 2]);
  });

  it('normalizes negative indexes before validating code digits', () => {
    expect(
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: -1,
        assignmentVersion: testAssignmentVersion,
      }),
    ).toEqual([6, 5, 2, 0]);
  });

  it('rejects unsupported versions before assignment', () => {
    expect(() =>
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: 1,
        assignmentVersion: {
          ...testAssignmentVersion,
          strategyId: 'future-canonical-v1',
        },
      }),
    ).toThrow('Unsupported kanji code assignment version.');
  });

  it('rejects non-integer canonical indexes', () => {
    expect(() =>
      base8StablePermutationAssignment.assignCode({
        canonicalIndex: 1.5,
        assignmentVersion: testAssignmentVersion,
      }),
    ).toThrow('canonicalIndex must be an integer for stable code assignment.');
  });
});
