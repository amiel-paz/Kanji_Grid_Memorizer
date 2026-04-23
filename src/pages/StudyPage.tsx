import { useMemo, useRef, useState } from 'react';
import { DrillModePicker } from '../components/DrillModePicker';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { KanjiCueCard } from '../components/KanjiCueCard';
import type { KanjiEntry } from '../domain/content/types';
import { getDrillById, STARTER_DRILLS } from '../domain/drills/configs';
import type { DrillMode, ReviewGrade } from '../domain/drills/types';
import {
  advanceSessionItem,
  answerSessionReview,
  type CreateSessionOptions,
  createSession,
  DEFAULT_DAILY_NEW_KANJI_LIMIT,
  getCueOpacity,
  type SessionRandomSource,
} from '../domain/session/session';
import { loadProgressRecords, persistReviewEventToProgressStore } from '../state/progressStore';

interface StudyPageProps {
  readonly sessionOptions?: CreateSessionOptions;
}

export function StudyPage({ sessionOptions }: StudyPageProps) {
  const sessionRandomRef = useRef<SessionRandomSource>(sessionOptions?.random ?? Math.random);
  const progressByKanjiRef = useRef(loadProgressRecords());
  const [drillId, setDrillId] = useState(STARTER_DRILLS[0]?.id ?? 'learn');
  const drill = getDrillById(drillId);
  const createPageSession = (
    nextDrill = drill,
    entries: readonly KanjiEntry[] = canonicalKanjiDeck,
    random: SessionRandomSource = sessionRandomRef.current,
  ) =>
    createSession(entries, nextDrill, {
      ...sessionOptions,
      createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
      random,
      seedProgressByKanji: progressByKanjiRef.current,
    });
  const [session, setSession] = useState(() => createPageSession(drill));
  const [readingsRevealed, setReadingsRevealed] = useState(drill.mode === 'learn');
  const isSessionComplete = session.queue.length === 0 || session.activeKanji === null;

  const activeEntry = useMemo(
    () =>
      session.activeKanji === null
        ? null
        : canonicalKanjiDeck.find((entry) => entry.kanji === session.activeKanji) ?? null,
    [session.activeKanji],
  );

  if (!isSessionComplete && !activeEntry) {
    return <main className="p-8">No kanji data available.</main>;
  }

  const activeKanji = activeEntry?.kanji ?? null;
  const opacity = activeKanji === null ? null : getCueOpacity(session, activeKanji);
  const isReviewMode = drill.mode !== 'learn';
  const showReadings = !isReviewMode || readingsRevealed;
  const activeIndex = activeKanji === null ? session.selectedKanji.length - 1 : session.selectedKanji.indexOf(activeKanji);
  const activeItemState = activeKanji === null ? null : session.itemStateByKanji[activeKanji] ?? null;
  const answerPanelId = 'study-answer-panel';

  if (!isSessionComplete && !activeItemState) {
    throw new Error(`Active kanji is missing from session state: ${activeKanji}`);
  }

  const modePresentation = getModePresentation({
    drillMode: drill.mode,
    cueOpacity: opacity ?? 0,
  });
  const answerStateSummary = isSessionComplete
    ? 'Complete'
    : isReviewMode
    ? readingsRevealed
      ? 'Answer revealed'
      : 'Hidden until reveal'
    : 'Always visible';

  function handleDrillChange(nextDrillId: string) {
    const nextDrill = getDrillById(nextDrillId);
    const currentSessionEntries = getSelectedEntriesForSession(session.selectedKanji);
    setDrillId(nextDrillId);
    setSession(
      createPageSession(
        nextDrill,
        currentSessionEntries.length > 0 ? currentSessionEntries : canonicalKanjiDeck,
        currentSessionEntries.length > 0 ? () => 0 : sessionRandomRef.current,
      ),
    );
    setReadingsRevealed(nextDrill.mode === 'learn');
  }

  function handleRestartDrill() {
    setSession(createPageSession(drill));
    setReadingsRevealed(drill.mode === 'learn');
  }

  function handleReviewAnswer(reviewGrade: ReviewGrade) {
    if (activeKanji === null) {
      return;
    }

    const { session: nextSession, event } = answerSessionReview(
      session,
      reviewGrade,
      activeKanji,
      sessionRandomRef.current,
    );
    progressByKanjiRef.current = persistReviewEventToProgressStore(
      progressByKanjiRef.current,
      event,
      new Date().toISOString(),
    );
    setSession(nextSession);
    setReadingsRevealed(false);
  }

  function handleAdvanceLearnItem() {
    if (activeKanji === null) {
      return;
    }

    setSession((current) => advanceSessionItem(current, activeKanji));
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Study</p>
        <h1 className="page-title">Study one kanji at a time</h1>
        <p className="body-copy">
          Choose a drill, work through the current session, and reveal meanings and readings only
          when you need them. Truly new kanji are capped at {DEFAULT_DAILY_NEW_KANJI_LIMIT} per
          local day from saved progress, and started-but-unfinished new kanji carry forward before
          fresh replacements. Kanji that clear the new-item fade ladder persist as review-bank
          candidates, but the app still does not do due dates or full mixed new/review
          orchestration.
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
              <p className="section-kicker">Session</p>
              <h2 className="section-title" id="session-overview-title">
                {isSessionComplete ? 'Session complete' : `Now studying ${activeKanji}`}
              </h2>
            </div>
            <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
              {drill.label}. Item {Math.min(activeIndex + 1, session.selectedKanji.length)} of{' '}
              {session.selectedKanji.length}. Cue opacity{' '}
              {opacity === null ? 'not applicable' : `${Math.round(opacity * 100)} percent`}.{' '}
              {answerStateSummary}.
            </p>
            <div className="study-overview-row">
              <span>Drill</span>
              <strong>{drill.label}</strong>
            </div>
            <div className="study-overview-row">
              <span>Position in session</span>
              <strong>
                {Math.min(activeIndex + 1, session.selectedKanji.length)} / {session.selectedKanji.length}
              </strong>
            </div>
            <div className="study-overview-row">
              <span>Cue opacity</span>
              <strong>{opacity === null ? 'Completed' : `${Math.round(opacity * 100)}%`}</strong>
            </div>
            <div className="study-overview-row">
              <span>Answer state</span>
              <strong>{answerStateSummary}</strong>
            </div>
            <div className="study-overview-row">
              <span>Source set</span>
              <strong>{activeEntry?.sourceSet ?? 'Session complete'}</strong>
            </div>
          </section>
        </aside>

        <section className="surface-panel study-stage" aria-labelledby="study-stage-title">
          <div className="study-stage-card">
            <div className="section-heading">
              <p className="section-kicker">Study surface</p>
              <h2 className="section-title" id="study-stage-title">
                {isSessionComplete ? `${drill.label} complete` : drill.label}
              </h2>
              <p className="body-copy">
                {isSessionComplete
                  ? completionDescriptionForMode(drill.mode)
                  : modePresentation.stageDescription}
              </p>
            </div>

            {isSessionComplete || activeEntry === null || activeKanji === null ? (
              <div className="study-complete-card">
                <p className="section-kicker">Session complete</p>
                <p className="section-title">This batch is clear</p>
                <p className="fine-print">
                  Good answers at zero cue leave the recall batch for the rest of this run.
                </p>
              </div>
            ) : (
              <KanjiCueCard
                kanji={activeKanji}
                code={activeEntry.code}
                opacity={opacity ?? 0}
                label={modePresentation.cardLabel(activeKanji)}
              />
            )}

            <dl className="study-stage-meta" aria-label="Mode summary">
              <div>
                <dt>Focus</dt>
                <dd>{isSessionComplete ? completionFocusLabel(drill.mode) : modePresentation.focusLabel}</dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>{isSessionComplete ? 'No active review card' : modePresentation.supportSummary}</dd>
              </div>
              <div>
                <dt>Session counts</dt>
                <dd>
                  {isSessionComplete || activeItemState === null
                    ? `${session.selectedKanji.length - session.queue.length} cleared / ${session.selectedKanji.length} selected`
                    : `${activeItemState.goodCount} good / ${activeItemState.attempts} attempts`}
                </dd>
              </div>
            </dl>
          </div>

          <div className="study-stage-details">
            <section aria-labelledby="study-actions-title" className="study-panel-block">
              <div className="section-heading">
                <p className="section-kicker">Answer</p>
                <h3 className="section-title" id="study-actions-title">
                  {isSessionComplete ? 'Session complete' : modePresentation.answerPanelTitle}
                </h3>
                <p className="fine-print">
                  {isSessionComplete
                    ? 'Start the drill again if you want a fresh batch, or switch modes to compare the shell.'
                    : modePresentation.answerPanelCopy}
                </p>
              </div>

              <div aria-live="polite" className="study-answer-panel" id={answerPanelId}>
                {isSessionComplete ? (
                  <p className="fine-print">
                    This session has no active card left in the queue.
                  </p>
                ) : showReadings && activeEntry ? (
                  <div className="study-answer-grid">
                    <section aria-labelledby="meaning-block-title" className="study-detail-group">
                      <h4 className="study-detail-group-title" id="meaning-block-title">
                        Meanings
                      </h4>
                      <p className="study-detail-group-copy">{activeEntry.meanings.join(', ')}</p>
                    </section>

                    <section aria-labelledby="reading-block-title" className="study-detail-group">
                      <h4 className="study-detail-group-title" id="reading-block-title">
                        Readings
                      </h4>
                      <dl className="study-detail-list">
                        <div>
                          <dt>Onyomi</dt>
                          <dd>{activeEntry.onyomi.join(', ')}</dd>
                        </div>
                        <div>
                          <dt>Kunyomi</dt>
                          <dd>{activeEntry.kunyomi.join(', ')}</dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                ) : activeEntry ? (
                  <div className="study-answer-grid">
                    <section aria-labelledby="meaning-block-title" className="study-detail-group">
                      <h4 className="study-detail-group-title" id="meaning-block-title">
                        Meanings
                      </h4>
                      <p className="fine-print">{modePresentation.hiddenReadingsCopy}</p>
                    </section>

                    <section
                      aria-labelledby="reading-block-title"
                      className="study-detail-group study-detail-group-blurred"
                    >
                      <h4 className="study-detail-group-title" id="reading-block-title">
                        Readings
                      </h4>
                      <p aria-hidden="true" className="study-detail-group-copy">
                        Hidden until reveal
                      </p>
                      <p className="sr-only">Readings stay hidden until you reveal the answer.</p>
                    </section>
                  </div>
                ) : (
                  <p className="fine-print">{modePresentation.hiddenReadingsCopy}</p>
                )}
              </div>

              {isSessionComplete ? (
                <div className="study-action-row">
                  <button className="btn btn-primary" type="button" onClick={handleRestartDrill}>
                    Restart this drill
                  </button>
                </div>
              ) : isReviewMode ? (
                readingsRevealed ? (
                  <>
                    <div className="study-grade-row">
                      <button
                        className="btn btn-secondary btn-square"
                        type="button"
                        onClick={() => handleReviewAnswer('again')}
                      >
                        Again
                      </button>
                      <button
                        className="btn btn-primary btn-square"
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
                        aria-controls={answerPanelId}
                        aria-expanded={readingsRevealed}
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

function getSelectedEntriesForSession(selectedKanji: readonly string[]): readonly KanjiEntry[] {
  return selectedKanji
    .map((kanji) => canonicalKanjiDeck.find((entry) => entry.kanji === kanji))
    .filter((entry): entry is KanjiEntry => entry !== undefined);
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
        stageDescription: 'Keep the full code cue, readings, and meanings in view while you get oriented to each kanji.',
        answerPanelTitle: 'Details stay visible',
        answerPanelCopy: 'Use this pass to connect the kanji, color cue, meanings, and readings without hiding support.',
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
          'Recall first, then reveal the answer. Session state lowers the cue after each good review.',
        answerPanelTitle: 'Reveal and grade',
        answerPanelCopy: 'Try to answer from memory before you reveal the meanings and readings.',
        hiddenReadingsCopy:
          'Try to say the meanings and readings before you reveal them. Good lowers the cue one step; Again raises it one step.',
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
        stageDescription: 'The kanji stays on screen, but the color cue remains hidden so the shell reads like a true recall pass.',
        answerPanelTitle: 'Reveal and grade',
        answerPanelCopy: 'Try to answer from the kanji alone before you reveal meanings and readings.',
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
        answerPanelTitle: 'Answer details',
        answerPanelCopy: 'Review the current item details.',
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

function completionDescriptionForMode(drillMode: DrillMode): string {
  switch (drillMode) {
    case 'faded-recall':
      return 'You cleared the current faded-recall batch. Cards that earned a clean zero-cue pass stayed out of rotation for the rest of this run.';
    case 'blind-recall':
      return 'You cleared the current blind-recall batch. Zero-cue passes are retired from the queue until you start a new session.';
    case 'learn':
      return 'You reached the end of this learn pass.';
    default:
      return 'You cleared the current session.';
  }
}

function completionFocusLabel(drillMode: DrillMode): string {
  switch (drillMode) {
    case 'faded-recall':
      return 'Review complete for the current faded-cue batch.';
    case 'blind-recall':
      return 'Review complete for the current blind-recall batch.';
    case 'learn':
      return 'Learn pass complete.';
    default:
      return 'Session complete.';
  }
}
