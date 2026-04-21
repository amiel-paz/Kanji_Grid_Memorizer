import { useMemo, useState } from 'react';
import { DrillModePicker } from '../components/DrillModePicker';
import { KanjiCueCard } from '../components/KanjiCueCard';
import { mockKanji } from '../data/mockKanji';
import { getDrillById, STARTER_DRILLS } from '../domain/drills/configs';
import type { DrillMode, ReviewGrade } from '../domain/drills/types';
import { createSession, getCueOpacity, recordReviewGrade } from '../domain/session/session';

export function StudyPage() {
  const [drillId, setDrillId] = useState(STARTER_DRILLS[0]?.id ?? 'learn');
  const drill = getDrillById(drillId);
  const [session, setSession] = useState(() => createSession(mockKanji, drill));
  const [readingsRevealed, setReadingsRevealed] = useState(drill.mode === 'learn');

  const activeEntry = useMemo(
    () => mockKanji.find((entry) => entry.kanji === session.activeKanji) ?? mockKanji[0],
    [session.activeKanji],
  );

  if (!activeEntry) {
    return <main className="p-8">No kanji data available.</main>;
  }

  const activeKanji = activeEntry.kanji;
  const opacity = getCueOpacity(session, activeKanji);
  const isReviewMode = drill.mode !== 'learn';
  const showReadings = !isReviewMode || readingsRevealed;
  const activeIndex = session.selectedKanji.indexOf(activeKanji);

  function handleDrillChange(nextDrillId: string) {
    const nextDrill = getDrillById(nextDrillId);
    setDrillId(nextDrillId);
    setSession(createSession(mockKanji, nextDrill));
    setReadingsRevealed(nextDrill.mode === 'learn');
  }

  function handleReviewAnswer(reviewGrade: ReviewGrade) {
    setSession((current) => recordReviewGrade(current, activeKanji, reviewGrade));
    setReadingsRevealed(false);
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Kanji Grid Memorizer</p>
        <h1 className="page-title">First usable study shell</h1>
        <p className="body-copy">
          Study one kanji at a time, choose a drill, and reveal help only when you need it.
        </p>
      </header>

      <div className="study-shell">
        <aside className="study-sidebar">
          <DrillModePicker
            drills={STARTER_DRILLS}
            selectedId={drillId}
            onSelect={handleDrillChange}
          />

          <section aria-labelledby="session-overview-title" className="surface-panel study-overview">
            <div className="section-heading">
              <p className="section-kicker">Current item</p>
              <h2 className="section-title" id="session-overview-title">
                {activeKanji} is ready to study
              </h2>
            </div>
            <div className="study-overview-row" aria-live="polite">
              <span>Drill</span>
              <strong>{drill.label}</strong>
            </div>
            <div className="study-overview-row">
              <span>Session position</span>
              <strong>
                {activeIndex + 1} / {session.selectedKanji.length}
              </strong>
            </div>
            <div className="study-overview-row">
              <span>Cue opacity</span>
              <strong>{Math.round(opacity * 100)}%</strong>
            </div>
            <div className="study-overview-row">
              <span>Fixture source</span>
              <strong>{activeEntry.sourceSet}</strong>
            </div>
          </section>
        </aside>

        <section className="surface-panel study-stage" aria-labelledby="study-stage-title">
          <div className="study-stage-card">
            <div className="section-heading">
              <p className="section-kicker">Study surface</p>
              <h2 className="section-title" id="study-stage-title">
                {drill.label}
              </h2>
              <p className="body-copy">{descriptionForMode(drill.mode)}</p>
            </div>

            <KanjiCueCard
              kanji={activeKanji}
              code={activeEntry.code}
              opacity={opacity}
              label={`${activeKanji} review card with faded color cue`}
            />
          </div>

          <div className="study-stage-details">
            <section aria-labelledby="study-prompt-title" className="study-panel-block">
              <div className="section-heading">
                <h3 className="section-title" id="study-prompt-title">
                  Try to recall the readings first
                </h3>
              </div>
              {showReadings ? (
                <dl className="study-detail-list">
                  <div>
                    <dt>Meanings</dt>
                    <dd>{activeEntry.meanings.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Onyomi</dt>
                    <dd>{activeEntry.onyomi.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Kunyomi</dt>
                    <dd>{activeEntry.kunyomi.join(', ')}</dd>
                  </div>
                </dl>
              ) : (
                <p className="fine-print">
                  Recall the readings from memory, then reveal them before choosing how it went.
                </p>
              )}
            </section>

            <section aria-labelledby="study-actions-title" className="study-panel-block">
              <h3 className="sr-only" id="study-actions-title">
                Study controls
              </h3>

              {isReviewMode ? (
                readingsRevealed ? (
                  <div className="study-action-row">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => handleReviewAnswer('again')}
                    >
                      Again
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => handleReviewAnswer('good')}
                    >
                      Good
                    </button>
                  </div>
                ) : (
                  <div className="study-action-row">
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => setReadingsRevealed(true)}
                    >
                      Reveal readings
                    </button>
                  </div>
                )
              ) : (
                <p className="fine-print">
                  Learn mode keeps readings visible and does not introduce review grading yet.
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function descriptionForMode(mode: DrillMode): string {
  switch (mode) {
    case 'learn':
      return 'Show kanji, full cue, readings, and meanings.';
    case 'faded-recall':
      return 'Show the kanji with cue opacity controlled by session performance.';
    case 'blind-recall':
      return 'Show the kanji without visual cue support.';
    default:
      return 'TODO: Define this drill mode.';
  }
}
