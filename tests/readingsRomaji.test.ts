import { describe, expect, it } from 'vitest';
import {
  formatReadingWithRomaji,
  formatReadingsWithRomaji,
  romanizeKanjiReading,
} from '../src/domain/readings/romaji';

describe('romaji reading helpers', () => {
  it('romanizes on and kun readings for learner display', () => {
    expect(romanizeKanjiReading('ニチ')).toBe('nichi');
    expect(romanizeKanjiReading('ジツ')).toBe('jitsu');
    expect(romanizeKanjiReading('キョウ')).toBe('kyou');
    expect(romanizeKanjiReading('ガッコウ')).toBe('gakkou');
    expect(romanizeKanjiReading('た.りる')).toBe('tariru');
    expect(romanizeKanjiReading('-づ.れ')).toBe('zure');
    expect(romanizeKanjiReading('しんよう')).toBe("shin'you");
  });

  it('formats each reading with romaji in parentheses', () => {
    expect(formatReadingWithRomaji('た.りる')).toBe('た.りる (tariru)');
    expect(formatReadingsWithRomaji(['ニチ', 'ジツ'])).toBe('ニチ (nichi)、ジツ (jitsu)');
    expect(formatReadingsWithRomaji([], ', ')).toBe('None listed');
  });
});
