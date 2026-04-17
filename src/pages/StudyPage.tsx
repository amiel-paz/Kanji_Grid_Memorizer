import { useMemo, useState } from 'react';
import { DrillModePicker } from '../components/DrillModePicker';
import { KanjiTile } from '../components/KanjiTile';
import { mockKanji } from '../data/mockKanji';
import { getDrillById, STARTER_DRILLS } from '../domain/drills/configs';
import { createSession, getCueOpacity, recordAnswer } from '../domain/session/session';

export function StudyPage() {
  const [drillId, setDrillId] = useState(STARTER_DRILLS[0]?.id ?? 'learn');
  const drill = getDrillById(drillId);
  const [session, setSession] = useState(() => createSession(mockKanji, drill));

  const activeEntry = useMemo(
    () => mockKanji.find((entry) => entry.kanji === session.activeKanji) ?? mockKanji[0],
    [session.activeKanji],
  );

  if (!activeEntry) {
    return <main className="p-8">No kanji data available.</main>;
  }

  const opacity = getCueOpacity(session, activeEntry.kanji);
  const showReadings = drill.mode === 'learn';

  function handleDrillChange(nextDrillId: string) {
    const nextDrill = getDrillById(nextDrillId);
    setDrillId(nextDrillId);
    setSession(createSession(mockKanji, nextDrill));
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Kanji Grid Memorizer
        </p>
        <h1 className="text-3xl font-bold text-gray-950">Stable color codes, fading cues.</h1>
        <p className="max-w-2xl text-gray-700">
          This shell demonstrates the central rule: kanji records store code digits, while cue
          opacity comes from the current drill session.
        </p>
      </header>

      <DrillModePicker drills={STARTER_DRILLS} selectedId={drillId} onSelect={handleDrillChange} />

      <section className="grid gap-6 rounded border border-gray-200 bg-white p-6 md:grid-cols-[auto_1fr]">
        <KanjiTile code={activeEntry.code} opacity={opacity} size="lg" />

        <div className="flex flex-col gap-4">
          <div>
            <div className="text-7xl leading-none text-gray-950">{activeEntry.kanji}</div>
            <p className="mt-2 text-sm text-gray-600">
              Code opacity for this session: {opacity.toFixed(2)}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-950">{drill.label}</h2>
            <p className="text-gray-700">{descriptionForMode(drill.mode)}</p>
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
            <p className="text-sm text-gray-600">
              TODO: Add answer choices and real interaction for this drill mode.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded bg-gray-950 px-4 py-2 text-white"
              type="button"
              onClick={() => setSession((current) => recordAnswer(current, activeEntry.kanji, true))}
            >
              Mock correct
            </button>
            <button
              className="rounded border border-gray-300 px-4 py-2 text-gray-900"
              type="button"
              onClick={() => setSession((current) => recordAnswer(current, activeEntry.kanji, false))}
            >
              Mock miss
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function descriptionForMode(mode: string): string {
  switch (mode) {
    case 'learn':
      return 'Show kanji, full cue, readings, and meanings.';
    case 'recognize-from-grid':
      return 'TODO: Show the grid and ask the learner to pick the matching kanji.';
    case 'match-grid-to-kanji':
      return 'TODO: Show the kanji and ask the learner to pick the matching grid.';
    case 'faded-recall':
      return 'Show the kanji with cue opacity controlled by session performance.';
    case 'blind-recall':
      return 'Show the kanji without visual cue support.';
    default:
      return 'TODO: Define this drill mode.';
  }
}
