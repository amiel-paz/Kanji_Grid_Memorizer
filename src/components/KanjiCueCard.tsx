import type { CSSProperties } from 'react';
import { getKanjiCodeCells, type KanjiCode } from '../domain/encoding/palette';
import { validateTileOpacity } from './kanjiTileValidation';

interface KanjiCueCardProps {
  kanji: string;
  code: KanjiCode;
  opacity: number;
  label?: string;
}

export function KanjiCueCard({ kanji, code, opacity, label }: KanjiCueCardProps) {
  validateTileOpacity(opacity);
  const cells = getKanjiCodeCells(code);

  return (
    <div
      aria-label={label ?? `${kanji} color cue card`}
      className="kanji-cue-card"
      role="img"
      style={{ '--cue-opacity': opacity } as CSSProperties}
    >
      <div aria-hidden="true" className="kanji-cue-grid">
        {cells.map((cell) => (
          <div key={cell.position} style={{ backgroundColor: cell.color }} />
        ))}
      </div>
      <div aria-hidden="true" className="kanji-cue-center">
        {kanji}
      </div>
    </div>
  );
}
