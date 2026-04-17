import type { AssignmentVersion } from '../types';
import type { KanjiCode } from './palette';

export interface CodeAssignmentInput {
  canonicalIndex: number;
  assignmentVersion: AssignmentVersion;
}

export interface CodeAssignmentStrategy {
  assignCode(input: CodeAssignmentInput): KanjiCode;
}

export const currentAssignmentVersion: AssignmentVersion = {
  id: 'mock-v0',
  sourceSets: ['mock-joyo'],
  description: 'Mock deterministic assignment for local scaffold data.',
};

export const base8IndexAssignment: CodeAssignmentStrategy = {
  assignCode(input) {
    // TODO: Replace this with the canonical assignment algorithm once Joyo import exists.
    // This starter keeps assignments deterministic by encoding canonicalIndex in base 8.
    const normalized = input.canonicalIndex % 4096;
    return [
      Math.floor(normalized / 512) % 8,
      Math.floor(normalized / 64) % 8,
      Math.floor(normalized / 8) % 8,
      normalized % 8,
    ] as KanjiCode;
  },
};
