import { assertKanjiCode, BASE8_COLORS, type KanjiCode } from '../domain/encoding/palette';

interface KanjiTileProps {
  code: KanjiCode;
  opacity: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClassByName = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

export function validateTileOpacity(opacity: number): void {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('Tile opacity must be a number between 0 and 1.');
  }
}

export function KanjiTile({ code, opacity, label = 'kanji color code', size = 'md' }: KanjiTileProps) {
  assertKanjiCode(code);
  validateTileOpacity(opacity);

  return (
    <div
      aria-label={label}
      className={`${sizeClassByName[size]} grid grid-cols-2 overflow-hidden rounded border border-gray-300 bg-white`}
      role="img"
      style={{ opacity }}
    >
      {code.map((digit, index) => (
        <div
          aria-hidden="true"
          key={`${digit}-${index}`}
          style={{ backgroundColor: BASE8_COLORS[digit] }}
        />
      ))}
    </div>
  );
}
