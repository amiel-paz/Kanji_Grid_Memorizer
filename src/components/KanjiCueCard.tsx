import type { CSSProperties } from 'react';
import { assertKanjiCode, BASE8_COLORS, type KanjiCode } from '../domain/encoding/palette';
import { validateTileOpacity } from './kanjiTileValidation';

interface KanjiCueCardProps {
  kanji: string;
  code: KanjiCode;
  opacity: number;
  label?: string;
}

export function KanjiCueCard({ kanji, code, opacity, label }: KanjiCueCardProps) {
  assertKanjiCode(code);
  validateTileOpacity(opacity);

  return (
    <div
      aria-label={label ?? `${kanji} color cue card`}
      className="kanji-cue-card"
      role="img"
      style={{ '--cue-opacity': opacity } as CSSProperties}
    >
      <div aria-hidden="true" className="kanji-cue-grid">
        {code.map((digit, index) => (
          <div key={`${digit}-${index}`} style={{ backgroundColor: BASE8_COLORS[digit] }} />
        ))}
      </div>
      <div aria-hidden="true" className="kanji-cue-center">
        {kanji}
      </div>
    </div>
  );
}
