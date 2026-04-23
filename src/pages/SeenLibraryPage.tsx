import { useMemo } from 'react';
import { KanjiTile } from '../components/KanjiTile';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { getSeenLibraryItems } from '../domain/progress/seenLibrary';
import type { ProgressConfidence } from '../domain/progress/types';
import { loadProgressRecords } from '../state/progressStore';

export function SeenLibraryPage() {
  const libraryItems = useMemo(
    () => getSeenLibraryItems(canonicalKanjiDeck, loadProgressRecords()),
    [],
  );

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
              Graded review results will add kanji here. Manual intake for outside encounters is a
              later planned worktree, so this page stays read-only for now.
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
              Sorted by most recently seen first, then by earlier first-seen history.
            </p>
          </div>

          <div className="seen-library-grid">
            {libraryItems.map(({ entry, progress }) => (
              <article className="surface-panel seen-library-card" key={entry.kanji}>
                <div className="seen-library-card-top">
                  <KanjiTile
                    code={entry.code}
                    label={`${entry.kanji} stable code grid`}
                    opacity={1}
                    showCodeDigits
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
