export const BASE8_COLORS = [
  '#D64545',
  '#3B6FD6',
  '#3FAE5A',
  '#D9B414',
  '#8A4BD6',
  '#E67E22',
  '#222222',
  '#20B8C9',
] as const;

export type CodeDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type KanjiCode = readonly [CodeDigit, CodeDigit, CodeDigit, CodeDigit];

export function isCodeDigit(value: number): value is CodeDigit {
  return Number.isInteger(value) && value >= 0 && value <= 7;
}

export function assertKanjiCode(digits: readonly number[]): asserts digits is KanjiCode {
  if (digits.length !== 4 || !digits.every(isCodeDigit)) {
    throw new Error('A kanji color code must contain exactly four base-8 digits.');
  }
}

export function formatKanjiCode(digits: KanjiCode): string {
  return digits.join('');
}
