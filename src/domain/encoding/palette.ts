export const KANJI_CODE_LENGTH = 4;

export const CODE_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export type CodeDigit = (typeof CODE_DIGITS)[number];

export const KANJI_CODE_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export type KanjiCodePosition = (typeof KANJI_CODE_POSITIONS)[number];

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

export type Base8Color = (typeof BASE8_COLORS)[CodeDigit];

export type KanjiCode = readonly [CodeDigit, CodeDigit, CodeDigit, CodeDigit];

export interface KanjiCodeCell {
  readonly position: KanjiCodePosition;
  readonly digit: CodeDigit;
  readonly color: Base8Color;
}

export function isCodeDigit(value: number): value is CodeDigit {
  return CODE_DIGITS.includes(value as CodeDigit);
}

export function assertKanjiCode(digits: readonly number[]): asserts digits is KanjiCode {
  if (digits.length !== KANJI_CODE_LENGTH || !digits.every(isCodeDigit)) {
    throw new Error('A kanji color code must contain exactly four base-8 digits.');
  }
}

export function createKanjiCode(digits: readonly number[]): KanjiCode {
  assertKanjiCode(digits);
  return digits;
}

export function formatKanjiCode(digits: KanjiCode): string {
  return digits.join('');
}

export function getColorForCodeDigit(digit: CodeDigit): Base8Color {
  return BASE8_COLORS[digit];
}

export function getKanjiCodeCells(code: KanjiCode): readonly KanjiCodeCell[] {
  assertKanjiCode(code);

  return [
    {
      position: KANJI_CODE_POSITIONS[0],
      digit: code[0],
      color: getColorForCodeDigit(code[0]),
    },
    {
      position: KANJI_CODE_POSITIONS[1],
      digit: code[1],
      color: getColorForCodeDigit(code[1]),
    },
    {
      position: KANJI_CODE_POSITIONS[2],
      digit: code[2],
      color: getColorForCodeDigit(code[2]),
    },
    {
      position: KANJI_CODE_POSITIONS[3],
      digit: code[3],
      color: getColorForCodeDigit(code[3]),
    },
  ];
}
