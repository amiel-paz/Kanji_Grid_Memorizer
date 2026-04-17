import { describe, expect, it } from 'vitest';
import { base8IndexAssignment, currentAssignmentVersion } from '../src/domain/encoding/assignment';
import { formatKanjiCode } from '../src/domain/encoding/palette';

describe('base-8 code assignment', () => {
  it('formats four base-8 digits as a compact code string', () => {
    expect(formatKanjiCode([0, 1, 2, 7])).toBe('0127');
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
