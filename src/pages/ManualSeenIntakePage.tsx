import { useDeferredValue, useMemo, useState } from 'react';
import { KanjiTile } from '../components/KanjiTile';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { getManualSeenIntakeEntries } from '../domain/progress/manualSeenIntake';
import {
  loadProgressRecords,
  persistManualSeenToProgressStore,
  type ProgressByKanji,
} from '../state/progressStore';

const MANUAL_INTAKE_VISIBLE_LIMIT = 120;

export function ManualSeenIntakePage() {
  const [progressByKanji, setProgressByKanji] = useState<ProgressByKanji>(() =>
    loadProgressRecords(),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const matchingEntries = useMemo(
    () =>
      getManualSeenIntakeEntries(
        canonicalKanjiDeck,
        progressByKanji,
        deferredSearchTerm,
      ),
    [deferredSearchTerm, progressByKanji],
  );
  const allUnseenEntries = useMemo(
    () => getManualSeenIntakeEntries(canonicalKanjiDeck, progressByKanji),
    [progressByKanji],
  );
  const visibleEntries = matchingEntries.slice(0, MANUAL_INTAKE_VISIBLE_LIMIT);
  const hasMoreMatches = matchingEntries.length > visibleEntries.length;

  function handleMarkEncountered(kanji: string) {
    const nextProgressByKanji = persistManualSeenToProgressStore(
      progressByKanji,
      kanji,
      new Date().toISOString(),
    );
    setProgressByKanji(nextProgressByKanji);
    setStatusMessage(
      `${kanji} is now marked as encountered in durable learner progress.`,
    );
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Manual intake</p>
        <h1 className="page-title">Mark an outside encounter as seen</h1>
        <p className="body-copy">
          Use this only when you really encountered a kanji outside the app and want it to enter
          later learner-state-driven study flows. This does not mark the kanji as mastered, and it
          does not create a live session.
        </p>
      </header>

      <section className="surface-panel manual-intake-section" aria-labelledby="manual-intake-title">
        <div className="section-heading">
          <p className="section-kicker">Not yet seen</p>
          <h2 className="section-title" id="manual-intake-title">
            {allUnseenEntries.length === 0
              ? 'Everything in the current deck is already marked seen'
              : `${matchingEntries.length} matching unseen kanji`}
          </h2>
          <p className="fine-print">
            Intake writes durable progress only. It does not rewrite stable content or skip the
            review flow that still has to build real familiarity later.
          </p>
        </div>

        <label className="manual-intake-filter">
          <span className="manual-intake-filter-label">Filter by kanji or meaning</span>
          <input
            className="manual-intake-input"
            type="search"
            value={searchTerm}
            placeholder="Try 木 or tree"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <p aria-live="polite" className="fine-print">
          {statusMessage ??
            (hasMoreMatches
              ? `Showing the first ${MANUAL_INTAKE_VISIBLE_LIMIT} of ${matchingEntries.length} matching unseen kanji.`
              : `${matchingEntries.length} unseen kanji match the current filter.`)}
        </p>

        {allUnseenEntries.length === 0 ? (
          <div className="manual-intake-empty">
            <p className="section-title">Nothing left to intake</p>
            <p className="fine-print">
              The current canonical deck is already fully represented in durable learner progress.
            </p>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="manual-intake-empty">
            <p className="section-title">No unseen matches for this filter</p>
            <p className="fine-print">
              Try a kanji character or a simpler meaning term.
            </p>
          </div>
        ) : (
          <div className="manual-intake-grid">
            {visibleEntries.map((entry) => (
              <article className="surface-panel manual-intake-card" key={entry.kanji}>
                <div className="manual-intake-card-top">
                  <KanjiTile
                    code={entry.code}
                    label={`${entry.kanji} stable code grid`}
                    opacity={1}
                    showCodeDigits
                    size="sm"
                  />

                  <div className="manual-intake-card-copy">
                    <div className="seen-library-heading-row">
                      <h3 className="seen-library-kanji">{entry.kanji}</h3>
                    </div>
                    <p className="study-detail-group-copy">{entry.meanings.join(', ')}</p>
                    <p className="fine-print">{entry.sourceSet} source</p>
                  </div>
                </div>

                <div className="manual-intake-actions">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => handleMarkEncountered(entry.kanji)}
                  >
                    Mark encountered
                  </button>
                  <p className="fine-print">
                    Adds this kanji to durable progress so later sessions can treat it as already
                    encountered.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
