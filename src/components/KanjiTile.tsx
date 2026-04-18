import { getKanjiCodeCells, type KanjiCode } from '../domain/encoding/palette';
import { validateTileOpacity } from './kanjiTileValidation';

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

export function KanjiTile({ code, opacity, label = 'kanji color code', size = 'md' }: KanjiTileProps) {
  validateTileOpacity(opacity);
  const cells = getKanjiCodeCells(code);

  return (
    <div
      aria-label={label}
      className={`${sizeClassByName[size]} grid grid-cols-2 overflow-hidden rounded-md border border-gray-300 bg-white`}
      role="img"
      style={{ opacity }}
    >
      {cells.map((cell) => (
        <div
          aria-hidden="true"
          key={cell.position}
          style={{ backgroundColor: cell.color }}
        />
      ))}
    </div>
  );
}
