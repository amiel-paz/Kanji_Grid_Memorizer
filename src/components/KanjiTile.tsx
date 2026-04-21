import { getKanjiCodeCells, type KanjiCode } from '../domain/encoding/palette';
import { validateTileOpacity } from './kanjiTileValidation';

interface KanjiTileProps {
  code: KanjiCode;
  opacity: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showCodeDigits?: boolean;
}

const sizeClassByName = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

export function KanjiTile({
  code,
  opacity,
  label = `kanji color code ${code.join(' ')}`,
  size = 'md',
  showCodeDigits = false,
}: KanjiTileProps) {
  validateTileOpacity(opacity);
  const cells = getKanjiCodeCells(code);

  return (
    <figure className="kanji-tile">
      <div
        aria-label={label}
        className={`${sizeClassByName[size]} kanji-tile-grid`}
        role="img"
        style={{ opacity }}
      >
        {cells.map((cell) => (
          <div aria-hidden="true" key={cell.position} style={{ backgroundColor: cell.color }} />
        ))}
      </div>
      {showCodeDigits ? (
        <figcaption className="kanji-tile-digits" aria-label={`code digits ${code.join(' ')}`}>
          {code.map((digit, index) => (
            <span key={`${digit}-${index}`}>{digit}</span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
