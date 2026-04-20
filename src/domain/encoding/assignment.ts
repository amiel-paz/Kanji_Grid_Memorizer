import type { AssignmentVersion } from '../content/types';
import { SOURCE_SET_IDS } from '../content/types';
import { CODE_DIGITS, createKanjiCode, KANJI_CODE_LENGTH, type KanjiCode } from './palette';

export interface CodeAssignmentInput {
  canonicalIndex: number;
  assignmentVersion: AssignmentVersion;
}

export interface CodeAssignmentStrategy {
  assignCode(input: CodeAssignmentInput): KanjiCode;
}

export const PLACEHOLDER_ASSIGNMENT_STRATEGY_ID = 'base8-stable-permutation-v1';

export const KANJI_CODE_SPACE_SIZE = CODE_DIGITS.length ** KANJI_CODE_LENGTH;
const PLACEHOLDER_PERMUTATION_MULTIPLIER = 2417;
const PLACEHOLDER_PERMUTATION_OFFSET = 1729;

export const currentAssignmentVersion: AssignmentVersion = {
  id: 'placeholder-v1',
  sourceSets: [SOURCE_SET_IDS.MOCK_JOYO],
  strategyId: PLACEHOLDER_ASSIGNMENT_STRATEGY_ID,
  codeSpaceSize: KANJI_CODE_SPACE_SIZE,
  description:
    'Placeholder deterministic assignment for local scaffold data. Maps canonicalIndex through a fixed permutation of the four-digit base-8 code space; not a canonical Joyo/Jinmeiyo import.',
};

function assertSupportedAssignmentVersion(assignmentVersion: AssignmentVersion): void {
  if (
    assignmentVersion.strategyId !== PLACEHOLDER_ASSIGNMENT_STRATEGY_ID ||
    assignmentVersion.codeSpaceSize !== KANJI_CODE_SPACE_SIZE
  ) {
    throw new Error('Unsupported kanji code assignment version.');
  }
}

function normalizeCanonicalIndex(canonicalIndex: number): number {
  if (!Number.isInteger(canonicalIndex)) {
    throw new Error('canonicalIndex must be an integer for placeholder code assignment.');
  }

  return ((canonicalIndex % KANJI_CODE_SPACE_SIZE) + KANJI_CODE_SPACE_SIZE) % KANJI_CODE_SPACE_SIZE;
}

function permuteNormalizedIndex(normalizedIndex: number): number {
  return (
    (normalizedIndex * PLACEHOLDER_PERMUTATION_MULTIPLIER + PLACEHOLDER_PERMUTATION_OFFSET) %
    KANJI_CODE_SPACE_SIZE
  );
}

export const base8IndexAssignment: CodeAssignmentStrategy = {
  assignCode(input) {
    assertSupportedAssignmentVersion(input.assignmentVersion);

    const normalized = normalizeCanonicalIndex(input.canonicalIndex);
    const assigned = permuteNormalizedIndex(normalized);

    return createKanjiCode([
      Math.floor(assigned / 512) % 8,
      Math.floor(assigned / 64) % 8,
      Math.floor(assigned / 8) % 8,
      assigned % 8,
    ]);
  },
};
