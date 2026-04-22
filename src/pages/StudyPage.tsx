import { useMemo, useRef, useState } from 'react';
import { DrillModePicker } from '../components/DrillModePicker';
import { KanjiCueCard } from '../components/KanjiCueCard';
import { mockKanji } from '../data/mockKanji';
import { getDrillById, STARTER_DRILLS } from '../domain/drills/configs';
import type { DrillMode, ReviewGrade } from '../domain/drills/types';
import {
  advanceSessionItem,
  answerSessionReview,
  type CreateSessionOptions,
  createSession,
  getCueOpacity,
} from '../domain/session/session';
import { loadProgressRecords, persistReviewEventToProgressStore } from '../state/progressStore';

interface StudyPageProps {
  readonly sessionOptions?: CreateSessionOptions;
}

export function StudyPage({ sessionOptions }: StudyPageProps) {
  const [drillId, setDrillId] = useState(STARTER_DRILLS[0]?.id ?? 'learn');
  const drill = getDrillById(drillId);
  const [session, setSession] = useState(() => createSession(mockKanji, drill, sessionOptions));
  const [readingsRevealed, setReadingsRevealed] = useState(drill.mode === 'learn');
  const progressByKanjiRef = useRef(loadProgressRecords());

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
  const activeItemState = session.itemStateByKanji[activeKanji];

  if (!activeItemState) {
    throw new Error(`Active kanji is missing from session state: ${activeKanji}`);
  }

  const modePresentation = getModePresentation({
    drillMode: drill.mode,
    cueOpacity: opacity,
  });

  function handleDrillChange(nextDrillId: string) {
    const nextDrill = getDrillById(nextDrillId);
    setDrillId(nextDrillId);
    setSession(createSession(mockKanji, nextDrill, sessionOptions));
    setReadingsRevealed(nextDrill.mode === 'learn');
  }

  function handleReviewAnswer(reviewGrade: ReviewGrade) {
    const { session: nextSession, event } = answerSessionReview(session, reviewGrade, activeKanji);
    progressByKanjiRef.current = persistReviewEventToProgressStore(
      progressByKanjiRef.current,
      event,
      new Date().toISOString(),
    );
    setSession(nextSession);
    setReadingsRevealed(false);
  }

  function handleAdvanceLearnItem() {
    setSession((current) => advanceSessionItem(current, activeKanji));
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Kanji Grid Memorizer</p>
        <h1 className="page-title">V1 study shell</h1>
        <p className="body-copy">
          Study one kanji at a time, switch drills, and reveal help only where this shell supports it.
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
              <span>Deck slot</span>
              <strong>
                {activeIndex + 1} / {session.selectedKanji.length}
              </strong>
            </div>
            <div className="study-overview-row">
              <span>Cue opacity</span>
              <strong>{Math.round(opacity * 100)}%</strong>
            </div>
            <div className="study-overview-row">
              <span>Visible support</span>
              <strong>{modePresentation.supportSummary}</strong>
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
              <p className="body-copy">{modePresentation.stageDescription}</p>
            </div>

            <KanjiCueCard
              kanji={activeKanji}
              code={activeEntry.code}
              opacity={opacity}
              label={modePresentation.cardLabel(activeKanji)}
            />

            <dl className="study-stage-meta" aria-label="Mode summary">
              <div>
                <dt>Focus</dt>
                <dd>{modePresentation.focusLabel}</dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>{modePresentation.supportSummary}</dd>
              </div>
              <div>
                <dt>Session counts</dt>
                <dd>
                  {activeItemState.goodCount} good / {activeItemState.attempts} attempts
                </dd>
              </div>
            </dl>
          </div>

          <div className="study-stage-details">
            <section aria-labelledby="study-actions-title" className="study-panel-block">
              <h3 className="sr-only" id="study-actions-title">
                Study controls
              </h3>

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
                <p className="fine-print">{modePresentation.hiddenReadingsCopy}</p>
              )}

              {isReviewMode ? (
                readingsRevealed ? (
                  <>
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
                    <p className="fine-print">{modePresentation.gradedStateCopy}</p>
                  </>
                ) : (
                  <>
                    <div className="study-action-row">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => setReadingsRevealed(true)}
                      >
                        {modePresentation.revealActionLabel}
                      </button>
                    </div>
                    <p className="fine-print">{modePresentation.preRevealActionCopy}</p>
                  </>
                )
              ) : (
                <>
                  <div className="study-action-row">
                    <button className="btn btn-primary" type="button" onClick={handleAdvanceLearnItem}>
                      Next kanji
                    </button>
                  </div>
                  <p className="fine-print">{modePresentation.learnActionCopy}</p>
                </>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function getModePresentation({
  drillMode,
  cueOpacity,
}: {
  drillMode: DrillMode;
  cueOpacity: number;
}) {
  switch (drillMode) {
    case 'learn':
      return {
        stageDescription:
          'Keep the full code cue, readings, and meanings in view while you get oriented to each kanji in this session shell.',
        hiddenReadingsCopy: '',
        revealActionLabel: '',
        preRevealActionCopy: '',
        gradedStateCopy: '',
        learnActionCopy: 'Move through the current session without review grading or saved progress updates.',
        supportSummary: 'Full cue plus readings',
        focusLabel: 'Associate the kanji with its cue, readings, and meanings.',
        cardLabel: (kanji: string) => `${kanji} learn card with full cue support`,
      };
    case 'faded-recall':
      return {
        stageDescription:
          'Recall first, then reveal the answer. In this simple rotating session, Good lowers the cue for that item on its next pass.',
        hiddenReadingsCopy:
          'Try to say the meanings and readings before you reveal them. Good lowers the cue one step for the next rotation; Again raises it one step.',
        revealActionLabel: 'Reveal readings and meanings',
        preRevealActionCopy: 'Reveal only after you have committed to an answer in your head.',
        gradedStateCopy:
          'Choose Good if you recalled it cleanly; choose Again if you want the next rotation to lean more on the cue.',
        learnActionCopy: '',
        supportSummary: `Cue visible at ${Math.round(cueOpacity * 100)}%`,
        focusLabel: 'Use the cue less as it fades across the session ladder.',
        cardLabel: (kanji: string) => `${kanji} faded recall card with session-dimmed cue`,
      };
    case 'blind-recall':
      return {
        stageDescription:
          'The kanji stays on screen, but the color cue remains hidden so this shell behaves like a cue-free recall pass.',
        hiddenReadingsCopy: 'No cue is shown in this drill. Reveal the answer only after you have tried to recall it unaided.',
        revealActionLabel: 'Reveal readings and meanings',
        preRevealActionCopy: 'This mode keeps cue support off after grading too, so the shell stays intentionally blind.',
        gradedStateCopy: 'Use Again or Good to mark the pass, but this drill does not reintroduce visible cue support.',
        learnActionCopy: '',
        supportSummary: 'Kanji only until reveal',
        focusLabel: 'Recall from the kanji alone with no visible cue.',
        cardLabel: (kanji: string) => `${kanji} blind recall card with hidden cue`,
      };
    default:
      return {
        stageDescription: 'TODO: Define this drill mode.',
        hiddenReadingsCopy: '',
        revealActionLabel: 'Reveal readings',
        preRevealActionCopy: '',
        gradedStateCopy: '',
        learnActionCopy: '',
        supportSummary: 'Unknown support',
        focusLabel: 'Study the current item.',
        cardLabel: (kanji: string) => `${kanji} study card`,
      };
  }
}
