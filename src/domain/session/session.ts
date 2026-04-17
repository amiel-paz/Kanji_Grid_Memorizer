import type { DrillConfig, KanjiEntry, SessionState } from '../types';

const MIN_DIMMED_OPACITY = 0.2;
const OPACITY_STEP = 0.25;

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
  const nextOpacity = wasCorrect
    ? Math.max(MIN_DIMMED_OPACITY, itemState.cueOpacity - OPACITY_STEP)
    : Math.min(1, itemState.cueOpacity + OPACITY_STEP);

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
