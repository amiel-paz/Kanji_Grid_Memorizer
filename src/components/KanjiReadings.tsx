import { formatReadingsWithRomaji } from '../domain/readings/romaji';

interface KanjiReadingsProps {
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
}

export function KanjiReadings({ onyomi, kunyomi }: KanjiReadingsProps) {
  return (
    <div className="kanji-readings" aria-label="Kanji readings">
      <section className="kanji-reading-block">
        <h4 className="kanji-reading-title">On readings</h4>
        <p className="kanji-reading-copy">{formatReadingsWithRomaji(onyomi)}</p>
      </section>
      <section className="kanji-reading-block">
        <h4 className="kanji-reading-title">Kun readings</h4>
        <p className="kanji-reading-copy">{formatReadingsWithRomaji(kunyomi)}</p>
      </section>
    </div>
  );
}
