import type { KanjiEntry } from '../content/types';
import { getDrillById } from '../drills/configs';
import type { DrillConfig, ReviewGrade } from '../drills/types';
import { CUE_OPACITY_LADDER, type CueOpacity, type SessionAnswerResult, type SessionState } from './types';

export type SessionRandomSource = () => number;

export interface CreateSessionOptions {
  readonly random?: SessionRandomSource;
  readonly id?: string;
}

export function createSession(
  entries: readonly KanjiEntry[],
  drillConfig: DrillConfig,
  options: CreateSessionOptions = {},
): SessionState {
  const selected = selectSessionEntries(entries, drillConfig.deckSize, options.random);
  const active = selected[0];

  if (!active) {
    throw new Error('Cannot create a study session without kanji entries.');
  }

  return {
    id: options.id ?? crypto.randomUUID(),
    drillConfigId: drillConfig.id,
    selectedKanji: selected.map((entry) => entry.kanji),
    queue: selected.map((entry) => entry.kanji),
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

export function selectSessionEntries(
  entries: readonly KanjiEntry[],
  deckSize: number,
  random: SessionRandomSource = Math.random,
): readonly KanjiEntry[] {
  const remainingEntries = [...entries];
  const selected: KanjiEntry[] = [];
  const selectionSize = Math.min(deckSize, remainingEntries.length);

  while (selected.length < selectionSize) {
    const selectedIndex = Math.floor(random() * remainingEntries.length);
    const [entry] = remainingEntries.splice(selectedIndex, 1);

    if (!entry) {
      throw new Error(`Session selection produced an invalid index: ${selectedIndex}`);
    }

    selected.push(entry);
  }

  return selected;
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

export function answerSessionReview(
  session: SessionState,
  reviewGrade: ReviewGrade,
  kanji: string = session.activeKanji,
): SessionAnswerResult {
  assertActiveKanji(session, kanji);

  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  const isGoodReview = reviewGrade === 'good';
  const nextOpacity = nextCueOpacity(session, itemState.cueOpacity, isGoodReview);
  const queueBefore = session.queue;
  const queueAfter = advanceQueue(queueBefore);
  const nextActiveKanji = queueAfter[0] ?? kanji;

  const nextSession = {
    ...session,
    queue: queueAfter,
    activeKanji: nextActiveKanji,
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

  return {
    session: nextSession,
    event: {
      type: 'review-answer',
      kanji,
      reviewGrade,
      previousCueOpacity: itemState.cueOpacity,
      nextCueOpacity: nextOpacity,
      queueBefore,
      queueAfter,
      nextActiveKanji,
    },
  };
}

export function recordReviewGrade(
  session: SessionState,
  kanji: string,
  reviewGrade: ReviewGrade,
): SessionState {
  return answerSessionReview(session, reviewGrade, kanji).session;
}

export function advanceSessionItem(session: SessionState, kanji: string = session.activeKanji): SessionState {
  assertActiveKanji(session, kanji);

  const nextQueue = advanceQueue(session.queue);

  return {
    ...session,
    queue: nextQueue,
    activeKanji: nextQueue[0] ?? kanji,
  };
}

function assertActiveKanji(session: SessionState, kanji: string) {
  if (kanji !== session.activeKanji) {
    throw new Error(`Only the active kanji can be advanced or answered: ${kanji}`);
  }
}

function advanceQueue(queue: readonly string[]): readonly string[] {
  const [activeKanji, ...remainingKanji] = queue;

  if (!activeKanji) {
    return queue;
  }

  return [...remainingKanji, activeKanji];
}

function nextCueOpacity(
  session: SessionState,
  currentOpacity: CueOpacity,
  isGoodReview: boolean,
): CueOpacity {
  const drill = getDrillById(session.drillConfigId);

  if (drill.cuePolicy === 'hidden') {
    return 0;
  }

  if (drill.cuePolicy === 'full') {
    return 1;
  }

  const currentIndex = CUE_OPACITY_LADDER.findIndex((step) => step === currentOpacity);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = isGoodReview
    ? Math.min(CUE_OPACITY_LADDER.length - 1, safeIndex + 1)
    : Math.max(0, safeIndex - 1);

  return CUE_OPACITY_LADDER[nextIndex] ?? 0;
}
