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
        <h1 className="page-title">Stable color codes, fading cues.</h1>
        <p className="body-copy">
          This shell demonstrates the central rule: kanji records store code digits, while cue
          opacity comes from the current drill session.
        </p>
      </header>

      <DrillModePicker drills={STARTER_DRILLS} selectedId={drillId} onSelect={handleDrillChange} />

      <section className="surface-panel grid gap-6 md:grid-cols-[minmax(16rem,20rem)_1fr]">
        <div className="flex flex-col gap-3">
          <KanjiCueCard
            kanji={activeKanji}
            code={activeEntry.code}
            opacity={opacity}
            label={`${activeKanji} review card with faded color cue`}
          />
          <p className="fine-print">Cue opacity: {Math.round(opacity * 100)}%</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">{drill.label}</h2>
            <p className="body-copy">{descriptionForMode(drill.mode)}</p>
          </div>

          {showReadings ? (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-700">Meanings</dt>
                <dd>{activeEntry.meanings.join(', ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Onyomi</dt>
                <dd>{activeEntry.onyomi.join(', ')}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Kunyomi</dt>
                <dd>{activeEntry.kunyomi.join(', ')}</dd>
              </div>
            </dl>
          ) : (
            <p className="fine-print">
              Recall the readings from memory, then reveal them before choosing how it went.
            </p>
          )}

          {isReviewMode ? (
            readingsRevealed ? (
              <div className="flex flex-wrap gap-3">
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
              <div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setReadingsRevealed(true)}
                >
                  Reveal readings
                </button>
              </div>
            )
          ) : null}
        </div>
      </section>
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
