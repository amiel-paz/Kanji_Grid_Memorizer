import type { AssignmentVersion } from '../content/types';
import { CODE_DIGITS, createKanjiCode, KANJI_CODE_LENGTH, type KanjiCode } from './palette';

export interface CodeAssignmentInput {
  canonicalIndex: number;
  assignmentVersion: AssignmentVersion;
}

export interface CodeAssignmentStrategy {
  assignCode(input: CodeAssignmentInput): KanjiCode;
}

export const BASE8_STABLE_PERMUTATION_STRATEGY_ID = 'base8-stable-permutation-v1';

export const KANJI_CODE_SPACE_SIZE = CODE_DIGITS.length ** KANJI_CODE_LENGTH;
const BASE8_STABLE_PERMUTATION_MULTIPLIER = 2417;
const BASE8_STABLE_PERMUTATION_OFFSET = 1729;

export function createBase8StableAssignmentVersion({
  id,
  sourceSetVersions,
  description,
}: Pick<AssignmentVersion, 'id' | 'sourceSetVersions' | 'description'>): AssignmentVersion {
  return {
    id,
    sourceSetVersions,
    strategyId: BASE8_STABLE_PERMUTATION_STRATEGY_ID,
    codeSpaceSize: KANJI_CODE_SPACE_SIZE,
    description,
  };
}

function assertSupportedAssignmentVersion(assignmentVersion: AssignmentVersion): void {
  if (
    assignmentVersion.strategyId !== BASE8_STABLE_PERMUTATION_STRATEGY_ID ||
    assignmentVersion.codeSpaceSize !== KANJI_CODE_SPACE_SIZE
  ) {
    throw new Error('Unsupported kanji code assignment version.');
  }
}

function normalizeCanonicalIndex(canonicalIndex: number): number {
  if (!Number.isInteger(canonicalIndex)) {
    throw new Error('canonicalIndex must be an integer for stable code assignment.');
  }

  return ((canonicalIndex % KANJI_CODE_SPACE_SIZE) + KANJI_CODE_SPACE_SIZE) % KANJI_CODE_SPACE_SIZE;
}

function permuteNormalizedIndex(normalizedIndex: number): number {
  return (
    (normalizedIndex * BASE8_STABLE_PERMUTATION_MULTIPLIER + BASE8_STABLE_PERMUTATION_OFFSET) %
    KANJI_CODE_SPACE_SIZE
  );
}

export const base8StablePermutationAssignment: CodeAssignmentStrategy = {
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

export const base8IndexAssignment = base8StablePermutationAssignment;
