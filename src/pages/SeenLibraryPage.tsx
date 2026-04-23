import { useEffect, useMemo, useState } from 'react';
import { KanjiCueCard } from '../components/KanjiCueCard';
import { KanjiReadings } from '../components/KanjiReadings';
import { PaginationControls } from '../components/PaginationControls';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { getSeenLibraryItems } from '../domain/progress/seenLibrary';
import type { ProgressConfidence } from '../domain/progress/types';
import { loadProgressRecords } from '../state/progressStore';

const SEEN_LIBRARY_PAGE_SIZE = 120;

export function SeenLibraryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const libraryItems = useMemo(
    () => getSeenLibraryItems(canonicalKanjiDeck, loadProgressRecords()),
    [],
  );
  const totalPages = Math.max(1, Math.ceil(libraryItems.length / SEEN_LIBRARY_PAGE_SIZE));
  const pageStartIndex = (currentPage - 1) * SEEN_LIBRARY_PAGE_SIZE;
  const visibleLibraryItems = libraryItems.slice(
    pageStartIndex,
    pageStartIndex + SEEN_LIBRARY_PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Seen library</p>
        <h1 className="page-title">Kanji you&apos;ve already encountered</h1>
        <p className="body-copy">
          This view is read-only and comes only from durable learner progress plus the canonical
          deck. It does not use live session state, and it does not mark anything new as seen.
        </p>
      </header>

      {libraryItems.length === 0 ? (
        <section className="surface-panel seen-library-empty" aria-labelledby="seen-library-empty-title">
          <div className="section-heading">
            <p className="section-kicker">Nothing seen yet</p>
            <h2 className="section-title" id="seen-library-empty-title">
              Your learner library is still empty
            </h2>
            <p className="fine-print">
              Graded review results will add kanji here. You can also use Manual intake for outside
              encounters, but this page itself stays read-only.
            </p>
          </div>
        </section>
      ) : (
        <section aria-labelledby="seen-library-title" className="seen-library-section">
          <div className="section-heading">
            <p className="section-kicker">Learner progress</p>
            <h2 className="section-title" id="seen-library-title">
              {libraryItems.length} seen kanji
            </h2>
            <p className="fine-print">
              Sorted by most recently seen first, then by earlier first-seen history. Pages show
              at most {SEEN_LIBRARY_PAGE_SIZE} cards at a time.
            </p>
          </div>

          <PaginationControls
            currentPage={currentPage}
            itemLabel="seen kanji"
            pageSize={SEEN_LIBRARY_PAGE_SIZE}
            totalItems={libraryItems.length}
            onPageChange={setCurrentPage}
          />

          <div className="seen-library-grid">
            {visibleLibraryItems.map(({ entry, progress }) => (
              <article className="surface-panel seen-library-card" key={entry.kanji}>
                <div className="seen-library-card-top">
                  <KanjiCueCard
                    kanji={entry.kanji}
                    code={entry.code}
                    label={`${entry.kanji} cue card preview`}
                    opacity={1}
                    size="sm"
                  />

                  <div className="seen-library-card-copy">
                    <div className="seen-library-heading-row">
                      <h3 className="seen-library-kanji">{entry.kanji}</h3>
                      <span className="seen-library-confidence">
                        {formatConfidenceLabel(progress.confidence)}
                      </span>
                    </div>
                    <p className="study-detail-group-copy">{entry.meanings.join(', ')}</p>
                    <KanjiReadings kunyomi={entry.kunyomi} onyomi={entry.onyomi} />
                    <p className="fine-print">
                      {entry.sourceSet} source
                    </p>
                  </div>
                </div>

                <dl className="seen-library-meta">
                  <div>
                    <dt>Seen</dt>
                    <dd>{formatSeenCount(progress.seenCount)}</dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>{formatSeenDate(progress.lastSeenAt)}</dd>
                  </div>
                  <div>
                    <dt>Review bank</dt>
                    <dd>{progress.reviewBankCandidate ? 'Eligible' : 'Not yet'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            itemLabel="seen kanji"
            pageSize={SEEN_LIBRARY_PAGE_SIZE}
            totalItems={libraryItems.length}
            onPageChange={setCurrentPage}
          />
        </section>
      )}
    </main>
  );
}

function formatConfidenceLabel(confidence: ProgressConfidence): string {
  switch (confidence) {
    case 'familiar':
      return 'Familiar';
    case 'learning':
      return 'Learning';
    case 'new':
    default:
      return 'New';
  }
}

function formatSeenCount(seenCount: number): string {
  return seenCount === 1 ? '1 review' : `${seenCount} reviews`;
}

function formatSeenDate(timestamp?: string): string {
  if (!timestamp) {
    return 'Unknown';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.valueOf())) {
    return 'Unknown';
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
