import { useEffect, useMemo, useRef, useState } from 'react';
import { DrillModePicker } from '../components/DrillModePicker';
import { KanjiReadings } from '../components/KanjiReadings';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { KanjiCueCard } from '../components/KanjiCueCard';
import type { KanjiEntry } from '../domain/content/types';
import { getDrillById, STARTER_DRILLS } from '../domain/drills/configs';
import type { DrillMode, ReviewGrade } from '../domain/drills/types';
import {
  hasSeenProgress,
  isReviewBankCandidateProgress,
  isUnfinishedNewItemProgress,
} from '../domain/progress/progress';
import {
  createDisabledReviewSchedulerClient,
  createFetchReviewSchedulerClient,
  type ReviewSchedulerClient,
} from '../domain/reviewScheduler/client';
import { DEFAULT_LEARNER_ID } from '../domain/reviewScheduler/defaults';
import {
  planLocalFallbackStudyRunSelection,
  planStudyRunSelection,
  type ReviewSelectionSource,
} from '../domain/reviewScheduler/studyRunPlanner';
import {
  advanceSessionItem,
  answerSessionReview,
  type CreateSessionOptions,
  createSession,
  DEFAULT_DAILY_NEW_KANJI_LIMIT,
  getCueOpacity,
  type SessionRandomSource,
} from '../domain/session/session';
import type { SessionState } from '../domain/session/types';
import {
  createProgressStore,
  loadProgressRecords,
  persistReviewEventToProgressStore,
  persistSeenToProgressStore,
} from '../state/progressStore';
import type { ProgressByKanji } from '../state/progressStore';

interface StudyPageProps {
  readonly sessionOptions?: CreateSessionOptions;
  readonly learnerId?: string;
  readonly progressStorageKey?: string;
  readonly reviewSchedulerClient?: ReviewSchedulerClient;
}

interface SessionBatchSummary {
  readonly carryoverCount: number;
  readonly freshNewCount: number;
  readonly reviewBackfillCount: number;
  readonly priorityReviewCount: number;
  readonly dailyNewLimit: number;
  readonly remainingDailyNewAllowance: number;
  readonly reviewSelectionSource: ReviewSelectionSource;
  readonly schedulerMessage?: string;
}

interface StudyRunState {
  readonly session: SessionState;
  readonly batchSummary: SessionBatchSummary;
}

interface ReadingMcqFeedbackState {
  readonly selectedKanji: string;
  readonly reviewGrade: ReviewGrade;
}

export function StudyPage({
  sessionOptions,
  learnerId = DEFAULT_LEARNER_ID,
  progressStorageKey,
  reviewSchedulerClient,
}: StudyPageProps) {
  const sessionRandomRef = useRef<SessionRandomSource>(sessionOptions?.random ?? Math.random);
  const progressStoreRef = useRef(createProgressStore(progressStorageKey));
  const progressByKanjiRef = useRef(loadProgressRecords(progressStoreRef.current));
  const reviewSchedulerRef = useRef<ReviewSchedulerClient>(
    reviewSchedulerClient ??
      (import.meta.env.VITE_REVIEW_SCHEDULER_BASE_URL
        ? createFetchReviewSchedulerClient(import.meta.env.VITE_REVIEW_SCHEDULER_BASE_URL)
        : createDisabledReviewSchedulerClient()),
  );
  const studyRunRequestRef = useRef(0);
  const initialSchedulerLoadRef = useRef(false);
  const loadStudyRunRef = useRef<(nextDrillId: string) => Promise<void>>(async () => {});
  const [drillId, setDrillId] = useState(STARTER_DRILLS[0]?.id ?? 'learn');
  const drill = getDrillById(drillId);
  const [studyRun, setStudyRun] = useState<StudyRunState>(() =>
    reviewSchedulerRef.current.availability === 'disabled'
      ? (() => {
          const plannedSelection = planLocalFallbackStudyRunSelection({
            createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
            dailyNewLimit: sessionOptions?.dailyNewLimit,
            drillConfigId: drillId,
            entries: canonicalKanjiDeck,
            learnerId,
            progressByKanji: progressByKanjiRef.current,
            random: sessionRandomRef.current,
          });

          return createStudyRunFromSelection({
            createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
            dailyNewLimit: sessionOptions?.dailyNewLimit,
            drillConfigId: drillId,
            progressByKanji: progressByKanjiRef.current,
            random: sessionRandomRef.current,
            reviewSelectionSource: plannedSelection.reviewSelectionSource,
            schedulerMessage: plannedSelection.schedulerMessage,
            selectedEntries: plannedSelection.selectedEntries,
            sessionOptions,
          });
        })()
      : createStudyRunFromSelection({
          createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
          dailyNewLimit: sessionOptions?.dailyNewLimit,
          drillConfigId: drillId,
          progressByKanji: progressByKanjiRef.current,
          selectedEntries: [],
          random: sessionRandomRef.current,
          reviewSelectionSource: 'not-needed',
          sessionOptions,
        }),
  );
  const [isStudyRunLoading, setIsStudyRunLoading] = useState(
    reviewSchedulerRef.current.availability === 'configured',
  );

  useEffect(() => {
    if (
      reviewSchedulerRef.current.availability !== 'configured' ||
      initialSchedulerLoadRef.current
    ) {
      return;
    }

    initialSchedulerLoadRef.current = true;
    void loadStudyRunRef.current(drillId);
  }, [drillId]);

  function createStudyRunFromSelection({
    drillConfigId,
    selectedEntries,
    createdAt,
    random,
    progressByKanji,
    dailyNewLimit,
    reviewSelectionSource,
    schedulerMessage,
    sessionOptions: nextSessionOptions,
  }: {
    readonly drillConfigId: string;
    readonly selectedEntries: readonly KanjiEntry[];
    readonly createdAt: string;
    readonly random: SessionRandomSource;
    readonly progressByKanji: ProgressByKanji;
    readonly dailyNewLimit: number | undefined;
    readonly reviewSelectionSource: ReviewSelectionSource;
    readonly schedulerMessage?: string;
    readonly sessionOptions: CreateSessionOptions | undefined;
  }): StudyRunState {
    const nextDrill = getDrillById(drillConfigId);
    const session = createSession(canonicalKanjiDeck, nextDrill, {
      ...nextSessionOptions,
      createdAt,
      choicePoolEntries: canonicalKanjiDeck,
      random,
      seedProgressByKanji: progressByKanji,
      selectedEntries,
    });

    return {
      session,
      batchSummary: summarizeSessionBatch(
        session.selectedKanji,
        progressByKanji,
        createdAt,
        dailyNewLimit,
        reviewSelectionSource,
        schedulerMessage,
      ),
    };
  }

  async function loadStudyRun(nextDrillId: string): Promise<void> {
    if (reviewSchedulerRef.current.availability !== 'configured') {
      return;
    }

    const requestId = studyRunRequestRef.current + 1;
    studyRunRequestRef.current = requestId;
    const createdAt = sessionOptions?.createdAt ?? new Date().toISOString();

    setIsStudyRunLoading(true);

    const plannedSelection = await planStudyRunSelection({
      createdAt,
      dailyNewLimit: sessionOptions?.dailyNewLimit,
      drillConfigId: nextDrillId,
      entries: canonicalKanjiDeck,
      learnerId,
      progressByKanji: progressByKanjiRef.current,
      random: sessionRandomRef.current,
      reviewSchedulerClient: reviewSchedulerRef.current,
    });

    if (studyRunRequestRef.current !== requestId) {
      return;
    }

    setStudyRun(
      createStudyRunFromSelection({
        createdAt,
        dailyNewLimit: sessionOptions?.dailyNewLimit,
        drillConfigId: nextDrillId,
        progressByKanji: progressByKanjiRef.current,
        random: sessionRandomRef.current,
        reviewSelectionSource: plannedSelection.reviewSelectionSource,
        schedulerMessage: plannedSelection.schedulerMessage,
        selectedEntries: plannedSelection.selectedEntries,
        sessionOptions,
      }),
    );
    setReadingsRevealed(getDrillById(nextDrillId).mode === 'learn');
    setIsStudyRunLoading(false);
  }

  loadStudyRunRef.current = loadStudyRun;

  const session = studyRun.session;
  const batchSummary = studyRun.batchSummary;
  const [readingsRevealed, setReadingsRevealed] = useState(drill.mode === 'learn');
  const [readingMcqFeedback, setReadingMcqFeedback] = useState<ReadingMcqFeedbackState | null>(
    null,
  );
  const isStudyRunPending = isStudyRunLoading && reviewSchedulerRef.current.availability === 'configured';
  const isSessionEmpty = session.selectedKanji.length === 0;
  const isSessionComplete = !isSessionEmpty && (session.queue.length === 0 || session.activeKanji === null);
  const isSessionInactive = isSessionEmpty || isSessionComplete;

  const activeEntry = useMemo(
    () =>
      session.activeKanji === null
        ? null
        : canonicalKanjiDeck.find((entry) => entry.kanji === session.activeKanji) ?? null,
    [session.activeKanji],
  );
  const activeKanji = activeEntry?.kanji ?? null;
  const activeChoiceEntries =
    activeKanji === null
      ? []
      : (session.choiceOptionsByKanji?.[activeKanji] ?? [])
          .map((kanji) => canonicalKanjiDeck.find((entry) => entry.kanji === kanji) ?? null)
          .filter((entry): entry is KanjiEntry => entry !== null);

  if (!isSessionInactive && !activeEntry) {
    return <main className="p-8">No kanji data available.</main>;
  }

  const opacity = activeKanji === null ? null : getCueOpacity(session, activeKanji);
  const isReadingMcqMode = drill.mode === 'reading-mcq';
  const hasReadingMcqFeedback = readingMcqFeedback !== null;
  const isRevealReviewMode = drill.mode === 'faded-recall' || drill.mode === 'blind-recall';
  const showReadings = drill.mode === 'learn' || readingsRevealed;
  const activeIndex = isSessionEmpty
    ? -1
    : activeKanji === null
      ? session.selectedKanji.length - 1
      : session.selectedKanji.indexOf(activeKanji);
  const activeItemState = activeKanji === null ? null : session.itemStateByKanji[activeKanji] ?? null;
  const answerPanelId = 'study-answer-panel';

  if (!isSessionInactive && !activeItemState) {
    throw new Error(`Active kanji is missing from session state: ${activeKanji}`);
  }

  if (!isSessionInactive && isReadingMcqMode && activeChoiceEntries.length === 0) {
    throw new Error(`Reading MCQ choices are missing for active kanji: ${activeKanji}`);
  }

  const modePresentation = getModePresentation({
    drillMode: drill.mode,
    cueOpacity: opacity ?? 0,
  });
  let answerStateSummary = 'Always visible';

  if (isStudyRunPending) {
    answerStateSummary = 'Loading due batch';
  } else if (isSessionEmpty) {
    answerStateSummary = 'Nothing queued';
  } else if (isSessionComplete) {
    answerStateSummary = 'Complete';
  } else if (isReadingMcqMode) {
    answerStateSummary = hasReadingMcqFeedback ? 'Feedback shown' : 'Choices visible';
  } else if (isRevealReviewMode) {
    answerStateSummary = readingsRevealed ? 'Answer revealed' : 'Hidden until reveal';
  }

  useEffect(() => {
    if (drill.mode !== 'learn' || isSessionInactive || activeKanji === null) {
      return;
    }

    if (hasSeenProgress(progressByKanjiRef.current[activeKanji])) {
      return;
    }

    progressByKanjiRef.current = persistSeenToProgressStore(
      progressByKanjiRef.current,
      activeKanji,
      new Date().toISOString(),
      progressStoreRef.current,
    );
  }, [activeKanji, drill.mode, isSessionInactive]);

  function handleDrillChange(nextDrillId: string) {
    const nextDrill = getDrillById(nextDrillId);
    const currentSessionEntries = getSelectedEntriesForSession(session.selectedKanji);
    setDrillId(nextDrillId);
    setReadingMcqFeedback(null);

    if (currentSessionEntries.length > 0) {
      setIsStudyRunLoading(false);
      setStudyRun(
        createStudyRunFromSelection({
          createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
          dailyNewLimit: sessionOptions?.dailyNewLimit,
          drillConfigId: nextDrillId,
          progressByKanji: progressByKanjiRef.current,
          random: () => 0,
          reviewSelectionSource: batchSummary.reviewSelectionSource,
          schedulerMessage: batchSummary.schedulerMessage,
          selectedEntries: currentSessionEntries,
          sessionOptions,
        }),
      );
      setReadingsRevealed(nextDrill.mode === 'learn');
      return;
    }

    if (reviewSchedulerRef.current.availability === 'configured') {
      void loadStudyRun(nextDrillId);
      return;
    }

    const plannedSelection = planLocalFallbackStudyRunSelection({
      createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
      dailyNewLimit: sessionOptions?.dailyNewLimit,
      drillConfigId: nextDrillId,
      entries: canonicalKanjiDeck,
      learnerId,
      progressByKanji: progressByKanjiRef.current,
      random: sessionRandomRef.current,
    });

    setStudyRun(
      createStudyRunFromSelection({
        createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
        dailyNewLimit: sessionOptions?.dailyNewLimit,
        drillConfigId: nextDrillId,
        progressByKanji: progressByKanjiRef.current,
        random: sessionRandomRef.current,
        reviewSelectionSource: plannedSelection.reviewSelectionSource,
        schedulerMessage: plannedSelection.schedulerMessage,
        selectedEntries: plannedSelection.selectedEntries,
        sessionOptions,
      }),
    );
    setReadingsRevealed(nextDrill.mode === 'learn');
  }

  function handleRestartDrill() {
    setReadingMcqFeedback(null);

    if (reviewSchedulerRef.current.availability === 'configured') {
      void loadStudyRun(drill.id);
      return;
    }

    const plannedSelection = planLocalFallbackStudyRunSelection({
      createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
      dailyNewLimit: sessionOptions?.dailyNewLimit,
      drillConfigId: drill.id,
      entries: canonicalKanjiDeck,
      learnerId,
      progressByKanji: progressByKanjiRef.current,
      random: sessionRandomRef.current,
    });

    setStudyRun(
      createStudyRunFromSelection({
        createdAt: sessionOptions?.createdAt ?? new Date().toISOString(),
        dailyNewLimit: sessionOptions?.dailyNewLimit,
        drillConfigId: drill.id,
        progressByKanji: progressByKanjiRef.current,
        random: sessionRandomRef.current,
        reviewSelectionSource: plannedSelection.reviewSelectionSource,
        schedulerMessage: plannedSelection.schedulerMessage,
        selectedEntries: plannedSelection.selectedEntries,
        sessionOptions,
      }),
    );
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
    const reviewedAt = new Date().toISOString();
    progressByKanjiRef.current = persistReviewEventToProgressStore(
      progressByKanjiRef.current,
      event,
      reviewedAt,
      progressStoreRef.current,
    );
    maybePersistSchedulerOutcome(activeKanji, reviewGrade, reviewedAt);
    setStudyRun((current) => ({
      ...current,
      session: nextSession,
    }));
    setReadingsRevealed(false);
    setReadingMcqFeedback(null);
  }

  function handleAdvanceLearnItem() {
    if (activeKanji === null) {
      return;
    }

    setStudyRun((current) => ({
      ...current,
      session: advanceSessionItem(current.session, activeKanji),
    }));
  }

  function handleReadingMcqChoice(selectedKanji: string) {
    if (activeKanji === null || hasReadingMcqFeedback) {
      return;
    }

    setReadingMcqFeedback({
      selectedKanji,
      reviewGrade: selectedKanji === activeKanji ? 'good' : 'again',
    });
  }

  function handleContinueReadingMcq() {
    if (activeKanji === null || readingMcqFeedback === null) {
      return;
    }

    const { session: nextSession, event } = answerSessionReview(
      session,
      readingMcqFeedback.reviewGrade,
      activeKanji,
      sessionRandomRef.current,
    );
    const reviewedAt = new Date().toISOString();
    progressByKanjiRef.current = persistReviewEventToProgressStore(
      progressByKanjiRef.current,
      event,
      reviewedAt,
      progressStoreRef.current,
    );
    maybePersistSchedulerOutcome(activeKanji, readingMcqFeedback.reviewGrade, reviewedAt);
    setStudyRun((current) => ({
      ...current,
      session: nextSession,
    }));
    setReadingMcqFeedback(null);
  }

  function maybePersistSchedulerOutcome(
    kanji: string,
    reviewGrade: ReviewGrade,
    reviewedAt: string,
  ) {
    if (reviewSchedulerRef.current.availability !== 'configured') {
      return;
    }

    if (!isReviewBankCandidateProgress(progressByKanjiRef.current[kanji])) {
      return;
    }

    void reviewSchedulerRef.current.recordReviewOutcomes({
      learnerId,
      outcomes: [
        {
          kanji,
          reviewGrade,
          reviewedAt,
        },
      ],
      updatedAt: reviewedAt,
    });
  }

  return (
    <main className="app-page">
      <header className="page-header">
        <p className="eyebrow">Study</p>
        <h1 className="page-title">A small local kanji loop that stays honest</h1>
        <p className="body-copy">
          Choose a drill, work through one small batch, and reveal meanings and readings only when
          you need them. Carryover and the daily new limit still stay local. When a review
          scheduler is configured, due review-bank picks come from the backend; otherwise the app
          falls back to the older local review-bank heuristic.
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
                {isStudyRunPending
                  ? 'Loading review batch'
                  : isSessionEmpty
                  ? 'Nothing queued right now'
                  : isSessionComplete
                    ? 'Session complete'
                    : `Now studying ${activeKanji}`}
              </h2>
            </div>
            <p aria-atomic="true" aria-live="polite" className="sr-only" role="status">
              {drill.label}. Item{' '}
              {session.selectedKanji.length === 0
                ? 0
                : Math.min(activeIndex + 1, session.selectedKanji.length)}{' '}
              of {session.selectedKanji.length}. Cue opacity{' '}
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
                {session.selectedKanji.length === 0
                  ? '0 / 0'
                  : `${Math.min(activeIndex + 1, session.selectedKanji.length)} / ${session.selectedKanji.length}`}
              </strong>
            </div>
            <div className="study-overview-row">
              <span>Cue opacity</span>
              <strong>
                {isSessionEmpty
                  ? 'No active card'
                  : isReadingMcqMode
                  ? 'Not used in this drill'
                  : opacity === null
                  ? 'Completed'
                  : `${Math.round(opacity * 100)}%`}
              </strong>
            </div>
            <div className="study-overview-row">
              <span>Answer state</span>
              <strong>{answerStateSummary}</strong>
            </div>
            <div className="study-overview-row">
              <span>Review source</span>
              <strong>{formatReviewSelectionSource(batchSummary)}</strong>
            </div>
            <div className="study-overview-row">
              <span>Batch mix</span>
              <strong>{formatBatchMix(batchSummary)}</strong>
            </div>
            <div className="study-overview-row">
              <span>Priority review</span>
              <strong>{formatPriorityReviewSummary(batchSummary)}</strong>
            </div>
            <div className="study-overview-row">
              <span>Today&apos;s new allowance</span>
              <strong>{formatDailyAllowanceSummary(batchSummary)}</strong>
            </div>
            <div className="study-overview-row">
              <span>Source set</span>
              <strong>{activeEntry?.sourceSet ?? 'No active card'}</strong>
            </div>
            {batchSummary.schedulerMessage ? (
              <p className="fine-print">{batchSummary.schedulerMessage}</p>
            ) : null}
          </section>
        </aside>

        <section className="surface-panel study-stage" aria-labelledby="study-stage-title">
          <div className="study-stage-card">
            <div className="section-heading">
              <p className="section-kicker">Study surface</p>
              <h2 className="section-title" id="study-stage-title">
                {isStudyRunPending
                  ? `${drill.label} loading`
                  : isSessionEmpty
                    ? `${drill.label} waiting`
                    : isSessionComplete
                      ? `${drill.label} complete`
                      : drill.label}
              </h2>
              <p className="body-copy">
                {isStudyRunPending
                  ? 'Checking the backend scheduler for due review items before building this batch.'
                  : isSessionEmpty
                  ? emptyStateDescriptionForMode(drill.mode, batchSummary.dailyNewLimit)
                  : isSessionComplete
                  ? completionDescriptionForMode(drill.mode)
                  : modePresentation.stageDescription}
              </p>
            </div>

            {isStudyRunPending ? (
              <div
                aria-live="polite"
                className="study-status-card study-status-card-empty"
                role="status"
              >
                <p className="section-kicker">Loading due reviews</p>
                <p className="section-title">Fetching backend review items</p>
                <p className="fine-print">
                  Carryover and new-item allowance stay local, but due review backfill is loading
                  from the scheduler.
                </p>
              </div>
            ) : isSessionInactive || activeEntry === null || activeKanji === null ? (
              <div
                aria-live="polite"
                className={`study-status-card ${isSessionEmpty ? 'study-status-card-empty' : 'study-status-card-complete'}`}
                role="status"
              >
                <p className="section-kicker">{isSessionEmpty ? 'Nothing queued' : 'Session complete'}</p>
                <p className="section-title">
                  {isSessionEmpty ? 'No cards are waiting in this batch' : 'This batch is clear'}
                </p>
                <p className="fine-print">
                  {isSessionEmpty
                    ? `This local MVP only starts cards when carryover, today's fresh-new allowance, or review-bank backfill is available.`
                    : 'Good answers at zero cue leave the recall batch for the rest of this run.'}
                </p>
              </div>
            ) : isReadingMcqMode ? (
              <div className="study-prompt-card">
                <p className="section-kicker">Reading prompt</p>
                <h3 className="section-title">Which kanji matches these readings?</h3>
                <KanjiReadings onyomi={activeEntry.onyomi} kunyomi={activeEntry.kunyomi} />
                <p className="fine-print">
                  Distractors use the three smallest normalized reading-edit distances available in
                  the local deck.
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
                <dd>
                  {isSessionEmpty
                    ? 'Wait for the next local batch or restart after progress changes.'
                    : isSessionComplete
                      ? completionFocusLabel(drill.mode)
                      : modePresentation.focusLabel}
                </dd>
              </div>
              <div>
                <dt>Support</dt>
                <dd>{isSessionInactive ? 'No active review card' : modePresentation.supportSummary}</dd>
              </div>
              <div>
                <dt>Session counts</dt>
                <dd>
                  {isSessionEmpty
                    ? `0 selected from a ${batchSummary.dailyNewLimit}-new daily cap`
                    : isSessionComplete || activeItemState === null
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
                  {isSessionInactive ? 'Session status' : modePresentation.answerPanelTitle}
                </h3>
                <p className="fine-print">
                  {isStudyRunPending
                    ? 'This batch is still loading from the backend scheduler.'
                    : isSessionEmpty
                    ? 'Restart the drill after you study more today, or switch modes to compare the same empty shell honestly.'
                    : isSessionComplete
                    ? 'Start the drill again if you want a fresh batch, or switch modes to compare the shell.'
                    : modePresentation.answerPanelCopy}
                </p>
              </div>

              <div aria-live="polite" className="study-answer-panel" id={answerPanelId}>
                {isStudyRunPending ? (
                  <div className="study-answer-empty">
                    <p className="fine-print">
                      Waiting for the configured review scheduler before finalizing this batch.
                    </p>
                  </div>
                ) : isSessionEmpty ? (
                  <div className="study-answer-empty">
                    <p className="fine-print">
                      No active card is queued yet. Fresh-new slots left today: {formatDailyAllowanceCount(batchSummary)}.
                    </p>
                    <p className="fine-print">
                      A later session can still start if carryover or review-bank cards become available.
                    </p>
                  </div>
                ) : isSessionComplete ? (
                  <p className="fine-print">
                    This session has no active card left in the queue.
                  </p>
                ) : isReadingMcqMode && activeEntry ? (
                  <>
                    <div className="study-choice-grid" role="group" aria-label="Reading MCQ choices">
                      {activeChoiceEntries.map((choiceEntry) => (
                        <button
                          key={choiceEntry.kanji}
                          aria-label={choiceEntry.kanji}
                          className="study-choice-button"
                          disabled={hasReadingMcqFeedback}
                          type="button"
                          onClick={() => handleReadingMcqChoice(choiceEntry.kanji)}
                        >
                          <KanjiCueCard
                            kanji={choiceEntry.kanji}
                            code={choiceEntry.code}
                            label={`${choiceEntry.kanji} reading MCQ choice card`}
                            opacity={1}
                            size="sm"
                          />
                        </button>
                      ))}
                    </div>

                    {readingMcqFeedback ? (
                      <div className="study-answer-empty">
                        <p className="section-title">
                          {readingMcqFeedback.reviewGrade === 'good' ? 'Correct' : 'Incorrect'}
                        </p>
                        <p className="fine-print">
                          {readingMcqFeedback.reviewGrade === 'good'
                            ? `${activeKanji} matches these readings.`
                            : `You chose ${readingMcqFeedback.selectedKanji}. Correct answer: ${activeKanji}.`}
                        </p>
                      </div>
                    ) : null}
                  </>
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

              {isStudyRunPending ? null : isSessionInactive ? (
                <div className="study-action-row">
                  <button className="btn btn-primary" type="button" onClick={handleRestartDrill}>
                    Restart this drill
                  </button>
                </div>
              ) : isReadingMcqMode ? (
                hasReadingMcqFeedback ? (
                  <>
                    <div className="study-action-row">
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={handleContinueReadingMcq}
                      >
                        Continue
                      </button>
                    </div>
                    <p className="fine-print">
                      Continue to record this answer and move to the next reading prompt.
                    </p>
                  </>
                ) : (
                  <p className="fine-print">{modePresentation.preRevealActionCopy}</p>
                )
              ) : isRevealReviewMode ? (
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
        learnActionCopy: 'Move through the current session without review grading. Newly encountered kanji still enter durable seen progress.',
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
    case 'reading-mcq':
      return {
        stageDescription:
          'Read the on and kun prompt, then choose the matching kanji from four locally confusable options.',
        answerPanelTitle: 'Choose the kanji',
        answerPanelCopy:
          'Pick the kanji whose readings match the prompt. A correct choice counts as Good; a wrong choice counts as Again.',
        hiddenReadingsCopy: '',
        revealActionLabel: '',
        preRevealActionCopy:
          'The three distractors are chosen by smallest normalized reading-edit distance from the same local deck.',
        gradedStateCopy: '',
        learnActionCopy: '',
        supportSummary: 'Reading prompt plus 4 kanji choices',
        focusLabel: 'Map the readings back to the kanji rather than recalling from the cue.',
        cardLabel: (kanji: string) => `${kanji} reading multiple-choice prompt`,
      };
    default:
      return {
        stageDescription: 'This drill mode is not configured yet.',
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
    case 'reading-mcq':
      return 'You cleared the current reading MCQ batch. Correct choices counted as Good and wrong choices counted as Again as the queue rotated.';
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
    case 'reading-mcq':
      return 'Reading MCQ batch complete.';
    case 'learn':
      return 'Learn pass complete.';
    default:
      return 'Session complete.';
  }
}

function summarizeSessionBatch(
  selectedKanji: readonly string[],
  progressByKanji: ProgressByKanji,
  createdAt: string,
  dailyNewLimit = DEFAULT_DAILY_NEW_KANJI_LIMIT,
  reviewSelectionSource: ReviewSelectionSource,
  schedulerMessage?: string,
): SessionBatchSummary {
  let carryoverCount = 0;
  let freshNewCount = 0;
  let reviewBackfillCount = 0;
  let priorityReviewCount = 0;

  for (const kanji of selectedKanji) {
    const progress = progressByKanji[kanji];

    if (isUnfinishedNewItemProgress(progress)) {
      carryoverCount += 1;
      continue;
    }

    if (isReviewBankCandidateProgress(progress)) {
      reviewBackfillCount += 1;
      if ((progress?.recentReviewFailureCount ?? 0) > 0) {
        priorityReviewCount += 1;
      }
      continue;
    }

    if (!hasSeenProgress(progress)) {
      freshNewCount += 1;
    }
  }

  const todayKey = toLocalDateKey(createdAt);
  const consumedTodayCount = Object.values(progressByKanji).filter(
    (progress) =>
      hasSeenProgress(progress) &&
      progress.firstSeenAt !== undefined &&
      toLocalDateKey(progress.firstSeenAt) === todayKey,
  ).length;

  return {
    carryoverCount,
    freshNewCount,
    reviewBackfillCount,
    priorityReviewCount,
    dailyNewLimit,
    remainingDailyNewAllowance: Math.max(0, dailyNewLimit - consumedTodayCount),
    reviewSelectionSource,
    schedulerMessage,
  };
}

function formatBatchMix(summary: SessionBatchSummary): string {
  return `${summary.carryoverCount} carryover, ${summary.freshNewCount} new, ${summary.reviewBackfillCount} review`;
}

function formatDailyAllowanceSummary(summary: SessionBatchSummary): string {
  if (summary.remainingDailyNewAllowance === 0) {
    return `0 of ${summary.dailyNewLimit} fresh slots left`;
  }

  return `${summary.remainingDailyNewAllowance} of ${summary.dailyNewLimit} fresh slots left`;
}

function formatPriorityReviewSummary(summary: SessionBatchSummary): string {
  if (summary.priorityReviewCount === 0) {
    return 'No recent-miss boost in this batch';
  }

  if (summary.priorityReviewCount === 1) {
    return '1 recent-miss review card';
  }

  return `${summary.priorityReviewCount} recent-miss review cards`;
}

function formatReviewSelectionSource(summary: SessionBatchSummary): string {
  switch (summary.reviewSelectionSource) {
    case 'backend-due':
      return 'Backend due schedule';
    case 'local-fallback':
      return 'Local fallback';
    case 'not-needed':
    default:
      return 'No due review needed';
  }
}

function formatDailyAllowanceCount(summary: SessionBatchSummary): string {
  return `${summary.remainingDailyNewAllowance} of ${summary.dailyNewLimit}`;
}

function emptyStateDescriptionForMode(drillMode: DrillMode, dailyNewLimit: number): string {
  switch (drillMode) {
    case 'learn':
      return `This drill is ready, but nothing is queued yet. The current local rules only admit carryover, up to ${dailyNewLimit} truly new kanji per day, or review-bank backfill.`;
    case 'blind-recall':
      return `There is no blind-recall batch queued right now. The current local rules only admit carryover, up to ${dailyNewLimit} truly new kanji per day, or review-bank backfill.`;
    case 'reading-mcq':
      return `There is no reading MCQ batch queued right now. The current local rules only admit carryover, up to ${dailyNewLimit} truly new kanji per day, or review-bank backfill.`;
    case 'faded-recall':
    default:
      return `There is no faded-recall batch queued right now. The current local rules only admit carryover, up to ${dailyNewLimit} truly new kanji per day, or review-bank backfill.`;
  }
}

function toLocalDateKey(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.valueOf())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
