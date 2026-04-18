import type { DrillConfig, KanjiEntry, SessionState } from '../types';

const CUE_OPACITY_STEPS = [1, 0.66, 0.33, 0] as const;

export function createSession(entries: KanjiEntry[], drillConfig: DrillConfig): SessionState {
  const selected = entries.slice(0, drillConfig.deckSize);
  const active = selected[0];

  if (!active) {
    throw new Error('Cannot create a study session without kanji entries.');
  }

  return {
    id: crypto.randomUUID(),
    drillConfigId: drillConfig.id,
    selectedKanji: selected.map((entry) => entry.kanji),
    activeKanji: active.kanji,
    itemStateByKanji: Object.fromEntries(
      selected.map((entry) => [
        entry.kanji,
        {
          kanji: entry.kanji,
          attempts: 0,
          correct: 0,
          cueOpacity: initialOpacityForDrill(drillConfig),
        },
      ]),
    ),
  };
}

export function initialOpacityForDrill(drillConfig: DrillConfig): number {
  if (drillConfig.cuePolicy === 'hidden') {
    return 0;
  }

  return 1;
}

export function getCueOpacity(session: SessionState, kanji: string): number {
  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  return itemState.cueOpacity;
}

export function recordAnswer(session: SessionState, kanji: string, wasCorrect: boolean): SessionState {
  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  // TODO: Replace this toy transition with the real "Random 10; dim on success" queue.
  const nextOpacity = nextCueOpacity(itemState.cueOpacity, wasCorrect);

  return {
    ...session,
    itemStateByKanji: {
      ...session.itemStateByKanji,
      [kanji]: {
        ...itemState,
        attempts: itemState.attempts + 1,
        correct: itemState.correct + (wasCorrect ? 1 : 0),
        cueOpacity: nextOpacity,
      },
    },
  };
}

function nextCueOpacity(currentOpacity: number, wasCorrect: boolean): number {
  const currentIndex = CUE_OPACITY_STEPS.findIndex((step) => step === currentOpacity);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = wasCorrect
    ? Math.min(CUE_OPACITY_STEPS.length - 1, safeIndex + 1)
    : Math.max(0, safeIndex - 1);

  return CUE_OPACITY_STEPS[nextIndex] ?? 0;
}
