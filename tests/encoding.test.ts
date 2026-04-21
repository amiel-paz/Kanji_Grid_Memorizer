import { describe, expect, it } from 'vitest';
import {
  CANONICAL_SOURCE_SET_PRIORITY,
  SOURCE_SET_DEFINITIONS,
  SOURCE_SET_IDS,
} from '../src/domain/content/types';
import {
  base8IndexAssignment,
  currentAssignmentVersion,
  KANJI_CODE_SPACE_SIZE,
  PLACEHOLDER_ASSIGNMENT_STRATEGY_ID,
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

  it('publishes explicit placeholder assignment version metadata', () => {
    expect(currentAssignmentVersion).toMatchObject({
      id: 'placeholder-v1',
      sourceSets: [SOURCE_SET_IDS.MOCK_JOYO],
      strategyId: PLACEHOLDER_ASSIGNMENT_STRATEGY_ID,
      codeSpaceSize: 4096,
    });
    expect(currentAssignmentVersion.description).toContain('Placeholder deterministic assignment');
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
      ownership: 'future-canonical-import',
    });
    expect(SOURCE_SET_DEFINITIONS[SOURCE_SET_IDS.JINMEIYO]).toMatchObject({
      ownership: 'future-canonical-import',
    });
    expect(CANONICAL_SOURCE_SET_PRIORITY).toEqual([SOURCE_SET_IDS.JOYO, SOURCE_SET_IDS.JINMEIYO]);
  });

  it('deterministically derives varied digits from canonical index', () => {
    const firstAssignment = base8IndexAssignment.assignCode({
      canonicalIndex: 65,
      assignmentVersion: currentAssignmentVersion,
    });
    const secondAssignment = base8IndexAssignment.assignCode({
      canonicalIndex: 65,
      assignmentVersion: currentAssignmentVersion,
    });

    expect(firstAssignment).toEqual([6, 1, 6, 2]);
    expect(secondAssignment).toEqual(firstAssignment);
  });

  it('maps the full placeholder code space as a stable permutation', () => {
    const assignedCodes = new Set<string>();

    for (let canonicalIndex = 0; canonicalIndex < KANJI_CODE_SPACE_SIZE; canonicalIndex += 1) {
      assignedCodes.add(
        formatKanjiCode(
          base8IndexAssignment.assignCode({
            canonicalIndex,
            assignmentVersion: currentAssignmentVersion,
          }),
        ),
      );
    }

    expect(assignedCodes.size).toBe(KANJI_CODE_SPACE_SIZE);
  });

  it('wraps canonical indexes through the stable four-digit permutation', () => {
    expect(
      base8IndexAssignment.assignCode({
        canonicalIndex: 4095,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toEqual([6, 5, 2, 0]);

    expect(
      base8IndexAssignment.assignCode({
        canonicalIndex: 4096,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toEqual([3, 3, 0, 1]);

    expect(
      base8IndexAssignment.assignCode({
        canonicalIndex: 4097,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toEqual([0, 0, 6, 2]);
  });

  it('normalizes negative indexes before validating code digits', () => {
    expect(
      base8IndexAssignment.assignCode({
        canonicalIndex: -1,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toEqual([6, 5, 2, 0]);
  });

  it('rejects unsupported versions before assignment', () => {
    expect(() =>
      base8IndexAssignment.assignCode({
        canonicalIndex: 1,
        assignmentVersion: {
          ...currentAssignmentVersion,
          strategyId: 'future-canonical-v1',
        },
      }),
    ).toThrow('Unsupported kanji code assignment version.');
  });

  it('rejects non-integer canonical indexes', () => {
    expect(() =>
      base8IndexAssignment.assignCode({
        canonicalIndex: 1.5,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toThrow('canonicalIndex must be an integer for placeholder code assignment.');
  });
});
