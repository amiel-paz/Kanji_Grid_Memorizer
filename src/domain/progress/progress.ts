import type { UserProgress } from '../types';

export function createInitialProgress(kanji: string): UserProgress {
  return {
    kanji,
    seenCount: 0,
    correctCount: 0,
    confidence: 'new',
  };
}

// TODO: Add small, explicit progress update helpers once a real drill flow exists.
