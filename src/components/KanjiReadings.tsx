interface KanjiReadingsProps {
  readonly onyomi: readonly string[];
  readonly kunyomi: readonly string[];
}

export function KanjiReadings({ onyomi, kunyomi }: KanjiReadingsProps) {
  return (
    <div className="kanji-readings" aria-label="Kanji readings">
      <section className="kanji-reading-block">
        <h4 className="kanji-reading-title">On readings</h4>
        <p className="kanji-reading-copy">{formatReadings(onyomi)}</p>
      </section>
      <section className="kanji-reading-block">
        <h4 className="kanji-reading-title">Kun readings</h4>
        <p className="kanji-reading-copy">{formatReadings(kunyomi)}</p>
      </section>
    </div>
  );
}

function formatReadings(readings: readonly string[]): string {
  return readings.length === 0 ? 'None listed' : readings.join('、');
}
