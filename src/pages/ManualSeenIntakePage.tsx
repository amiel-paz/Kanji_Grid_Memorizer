import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { KanjiCueCard } from '../components/KanjiCueCard';
import { KanjiReadings } from '../components/KanjiReadings';
import { PaginationControls } from '../components/PaginationControls';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { getManualSeenIntakeEntries } from '../domain/progress/manualSeenIntake';
import {
  createProgressStore,
  loadProgressRecords,
  persistManualSeenToProgressStore,
  subscribeToProgressStoreChanges,
  type ProgressByKanji,
} from '../state/progressStore';

const MANUAL_INTAKE_VISIBLE_LIMIT = 120;

interface ManualSeenIntakePageProps {
  readonly progressStorageKey?: string;
}

export function ManualSeenIntakePage({ progressStorageKey }: ManualSeenIntakePageProps) {
  const progressStore = useMemo(() => createProgressStore(progressStorageKey), [progressStorageKey]);
  const [progressByKanji, setProgressByKanji] = useState<ProgressByKanji>(() =>
    loadProgressRecords(progressStore),
  );
  const [currentPage, setCurrentPage] = useState(1);
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
  const totalPages = Math.max(1, Math.ceil(matchingEntries.length / MANUAL_INTAKE_VISIBLE_LIMIT));
  const pageStartIndex = (currentPage - 1) * MANUAL_INTAKE_VISIBLE_LIMIT;
  const visibleEntries = matchingEntries.slice(
    pageStartIndex,
    pageStartIndex + MANUAL_INTAKE_VISIBLE_LIMIT,
  );

  function handleMarkEncountered(kanji: string) {
    const nextProgressByKanji = persistManualSeenToProgressStore(
      progressByKanji,
      kanji,
      new Date().toISOString(),
      progressStore,
    );
    setProgressByKanji(nextProgressByKanji);
    setStatusMessage(
      `${kanji} is now marked as encountered in durable learner progress.`,
    );
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setProgressByKanji(loadProgressRecords(progressStore));

    return subscribeToProgressStoreChanges(
      () => setProgressByKanji(loadProgressRecords(progressStore)),
      progressStore.storageKey,
    );
  }, [progressStore]);

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
            review flow that still has to build real familiarity later. Pages show at most{' '}
            {MANUAL_INTAKE_VISIBLE_LIMIT} cards at a time.
          </p>
        </div>

        <label className="manual-intake-filter">
          <span className="manual-intake-filter-label">Filter by kanji, meaning, or reading</span>
          <input
            className="manual-intake-input"
            type="search"
            value={searchTerm}
            placeholder="Try 木, tree, or もく"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <p aria-live="polite" className="fine-print">
          {statusMessage ??
            `${matchingEntries.length} unseen kanji match the current filter.`}
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
          <>
            <PaginationControls
              currentPage={currentPage}
              itemLabel="unseen kanji"
              pageSize={MANUAL_INTAKE_VISIBLE_LIMIT}
              totalItems={matchingEntries.length}
              onPageChange={setCurrentPage}
            />

            <div className="manual-intake-grid">
              {visibleEntries.map((entry) => (
                <article className="surface-panel manual-intake-card" key={entry.kanji}>
                  <div className="manual-intake-card-top">
                    <KanjiCueCard
                      kanji={entry.kanji}
                      code={entry.code}
                      label={`${entry.kanji} cue card preview`}
                      opacity={1}
                      size="sm"
                    />

                    <div className="manual-intake-card-copy">
                      <div className="seen-library-heading-row">
                        <h3 className="seen-library-kanji">{entry.kanji}</h3>
                      </div>
                      <p className="study-detail-group-copy">{entry.meanings.join(', ')}</p>
                      <KanjiReadings kunyomi={entry.kunyomi} onyomi={entry.onyomi} />
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

            <PaginationControls
              currentPage={currentPage}
              itemLabel="unseen kanji"
              pageSize={MANUAL_INTAKE_VISIBLE_LIMIT}
              totalItems={matchingEntries.length}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>
    </main>
  );
}
