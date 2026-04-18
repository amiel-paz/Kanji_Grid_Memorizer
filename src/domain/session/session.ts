import type { KanjiEntry } from '../content/types';
import type { DrillConfig, ReviewGrade } from '../drills/types';
import { CUE_OPACITY_LADDER, type CueOpacity, type SessionState } from './types';

export function createSession(entries: readonly KanjiEntry[], drillConfig: DrillConfig): SessionState {
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
          goodCount: 0,
          cueOpacity: initialOpacityForDrill(drillConfig),
        },
      ]),
    ),
  };
}

export function initialOpacityForDrill(drillConfig: DrillConfig): CueOpacity {
  if (drillConfig.cuePolicy === 'hidden') {
    return 0;
  }

  return 1;
}

export function getCueOpacity(session: SessionState, kanji: string): CueOpacity {
  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  return itemState.cueOpacity;
}

export function recordReviewGrade(
  session: SessionState,
  kanji: string,
  reviewGrade: ReviewGrade,
): SessionState {
  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  // TODO: Replace this toy transition with the real "Random 10; dim on success" queue.
  const isGoodReview = reviewGrade === 'good';
  const nextOpacity = nextCueOpacity(itemState.cueOpacity, isGoodReview);

  return {
    ...session,
    itemStateByKanji: {
      ...session.itemStateByKanji,
      [kanji]: {
        ...itemState,
        attempts: itemState.attempts + 1,
        goodCount: itemState.goodCount + (isGoodReview ? 1 : 0),
        cueOpacity: nextOpacity,
      },
    },
  };
}

function nextCueOpacity(currentOpacity: CueOpacity, isGoodReview: boolean): CueOpacity {
  const currentIndex = CUE_OPACITY_LADDER.findIndex((step) => step === currentOpacity);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = isGoodReview
    ? Math.min(CUE_OPACITY_LADDER.length - 1, safeIndex + 1)
    : Math.max(0, safeIndex - 1);

  return CUE_OPACITY_LADDER[nextIndex] ?? 0;
}
