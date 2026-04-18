import { describe, expect, it } from 'vitest';
import { base8IndexAssignment, currentAssignmentVersion } from '../src/domain/encoding/assignment';
import {
  assertKanjiCode,
  BASE8_COLORS,
  CODE_DIGITS,
  formatKanjiCode,
  getKanjiCodeCells,
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

  it('deterministically derives digits from canonical index', () => {
    expect(
      base8IndexAssignment.assignCode({
        canonicalIndex: 65,
        assignmentVersion: currentAssignmentVersion,
      }),
    ).toEqual([0, 1, 0, 1]);
  });
});
