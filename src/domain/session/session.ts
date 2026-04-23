import type { KanjiEntry } from '../content/types';
import { getDrillById } from '../drills/configs';
import type { DrillConfig, ReviewGrade } from '../drills/types';
import {
  CUE_OPACITY_LADDER,
  DEFAULT_DAILY_NEW_KANJI_LIMIT,
  type CueOpacity,
  type SessionAnswerResult,
  type SessionProgressSeed,
  type SessionProgressSeedByKanji,
  type SessionState,
} from './types';

export { DEFAULT_DAILY_NEW_KANJI_LIMIT } from './types';
export type SessionRandomSource = () => number;

export interface CreateSessionOptions {
  readonly random?: SessionRandomSource;
  readonly id?: string;
  readonly seedProgressByKanji?: SessionProgressSeedByKanji;
  readonly createdAt?: string;
  readonly dailyNewLimit?: number;
}

export interface SelectSessionEntriesOptions {
  readonly random?: SessionRandomSource;
  readonly progressByKanji?: SessionProgressSeedByKanji;
  readonly createdAt?: string;
  readonly dailyNewLimit?: number;
}

export function createSession(
  entries: readonly KanjiEntry[],
  drillConfig: DrillConfig,
  options: CreateSessionOptions = {},
): SessionState {
  const seedProgressByKanji = options.seedProgressByKanji ?? {};
  const selected = selectSessionEntries(entries, drillConfig.deckSize, {
    random: options.random,
    progressByKanji: seedProgressByKanji,
    createdAt: options.createdAt,
    dailyNewLimit: options.dailyNewLimit,
  });
  const active = selected[0];

  if (entries.length === 0) {
    throw new Error('Cannot create a study session without kanji entries.');
  }

  return {
    id: options.id ?? crypto.randomUUID(),
    drillConfigId: drillConfig.id,
    selectedKanji: selected.map((entry) => entry.kanji),
    queue: selected.map((entry) => entry.kanji),
    activeKanji: active?.kanji ?? null,
    itemStateByKanji: Object.fromEntries(
      selected.map((entry) => [
        entry.kanji,
        {
          kanji: entry.kanji,
          attempts: 0,
          goodCount: 0,
          againCount: 0,
          cueOpacity: initialOpacityForDrill(drillConfig, seedProgressByKanji[entry.kanji]),
        },
      ]),
    ),
  };
}

export function selectSessionEntries(
  entries: readonly KanjiEntry[],
  deckSize: number,
  options: SelectSessionEntriesOptions = {},
): readonly KanjiEntry[] {
  const random = options.random ?? Math.random;
  const progressByKanji = options.progressByKanji ?? {};
  const remainingEntries = [...entries];
  const selected: KanjiEntry[] = [];
  let remainingDailyNewAllowance = getRemainingDailyNewAllowance(
    progressByKanji,
    options.createdAt,
    options.dailyNewLimit,
  );
  const selectionSize = Math.min(deckSize, remainingEntries.length);

  while (selected.length < selectionSize && remainingEntries.length > 0) {
    const selectedIndex = Math.floor(random() * remainingEntries.length);
    const [entry] = remainingEntries.splice(selectedIndex, 1);

    if (!entry) {
      throw new Error(`Session selection produced an invalid index: ${selectedIndex}`);
    }

    if (hasSeenProgress(progressByKanji[entry.kanji])) {
      selected.push(entry);
      continue;
    }

    if (remainingDailyNewAllowance > 0) {
      selected.push(entry);
      remainingDailyNewAllowance -= 1;
    }
  }

  return selected;
}

export function initialOpacityForDrill(
  drillConfig: DrillConfig,
  progressSeed?: SessionProgressSeed,
): CueOpacity {
  if (drillConfig.cuePolicy === 'hidden') {
    return 0;
  }

  if (drillConfig.cuePolicy === 'session-dim') {
    return initialSessionDimOpacity(progressSeed);
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
  kanji: string = session.activeKanji ?? '',
  random: SessionRandomSource = Math.random,
): SessionAnswerResult {
  assertActiveKanji(session, kanji);

  const itemState = session.itemStateByKanji[kanji];

  if (!itemState) {
    throw new Error(`Kanji is not part of this session: ${kanji}`);
  }

  const isGoodReview = reviewGrade === 'good';
  const nextOpacity = nextCueOpacity(session, itemState.cueOpacity, isGoodReview);
  const queueBefore = session.queue;
  const nextAgainCount = isGoodReview ? itemState.againCount : itemState.againCount + 1;
  const shouldRetire = shouldRetireReviewedKanji(session, itemState.cueOpacity, nextOpacity, reviewGrade);
  const queueAfter = reorderQueueAfterReview(queueBefore, kanji, {
    againCount: nextAgainCount,
    random,
    reviewGrade,
    shouldRetire,
  });
  const nextActiveKanji = queueAfter[0] ?? null;

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
        againCount: nextAgainCount,
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
  random: SessionRandomSource = Math.random,
): SessionState {
  return answerSessionReview(session, reviewGrade, kanji, random).session;
}

export function advanceSessionItem(session: SessionState, kanji: string = session.activeKanji ?? ''): SessionState {
  assertActiveKanji(session, kanji);

  const nextQueue = rotateQueue(session.queue);

  return {
    ...session,
    queue: nextQueue,
    activeKanji: nextQueue[0] ?? null,
  };
}

function assertActiveKanji(session: SessionState, kanji: string) {
  if (session.activeKanji === null || kanji !== session.activeKanji) {
    throw new Error(`Only the active kanji can be advanced or answered: ${kanji}`);
  }
}

// V1 keeps every selected item in a simple rotating queue for the full session.
function rotateQueue(queue: readonly string[]): readonly string[] {
  const [activeKanji, ...remainingKanji] = queue;

  if (!activeKanji) {
    return queue;
  }

  return [...remainingKanji, activeKanji];
}

function reorderQueueAfterReview(
  queue: readonly string[],
  reviewedKanji: string,
  {
    againCount,
    random,
    reviewGrade,
    shouldRetire,
  }: {
    againCount: number;
    random: SessionRandomSource;
    reviewGrade: ReviewGrade;
    shouldRetire: boolean;
  },
): readonly string[] {
  const [activeKanji, ...remainingKanji] = queue;

  if (!activeKanji) {
    return queue;
  }

  if (activeKanji !== reviewedKanji) {
    throw new Error(`Queue head does not match the reviewed kanji: ${reviewedKanji}`);
  }

  if (shouldRetire) {
    return remainingKanji;
  }

  const insertAt =
    reviewGrade === 'again'
      ? againInsertIndex(remainingKanji.length, againCount, random)
      : goodInsertIndex(remainingKanji.length, random);

  return insertIntoQueue(remainingKanji, reviewedKanji, insertAt);
}

function insertIntoQueue(queue: readonly string[], kanji: string, insertAt: number): readonly string[] {
  return [...queue.slice(0, insertAt), kanji, ...queue.slice(insertAt)];
}

function againInsertIndex(
  remainingLength: number,
  againCount: number,
  random: SessionRandomSource,
): number {
  if (remainingLength === 0) {
    return 0;
  }

  const maxOffset = Math.min(remainingLength, Math.max(0, 4 - againCount));
  return Math.floor(random() * (maxOffset + 1));
}

function goodInsertIndex(remainingLength: number, random: SessionRandomSource): number {
  if (remainingLength === 0) {
    return 0;
  }

  const earliestLateSlot = Math.floor(remainingLength / 2);
  const lateSlotCount = remainingLength - earliestLateSlot + 1;
  return earliestLateSlot + Math.floor(random() * lateSlotCount);
}

function shouldRetireReviewedKanji(
  session: SessionState,
  previousCueOpacity: CueOpacity,
  nextCueOpacity: CueOpacity,
  reviewGrade: ReviewGrade,
): boolean {
  if (reviewGrade !== 'good') {
    return false;
  }

  const drill = getDrillById(session.drillConfigId);

  if (drill.cuePolicy === 'full') {
    return false;
  }

  return previousCueOpacity === 0 && nextCueOpacity === 0;
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

function initialSessionDimOpacity(progressSeed?: SessionProgressSeed): CueOpacity {
  switch (progressSeed?.confidence) {
    case 'learning':
      return 0.66;
    case 'familiar':
      return 0.33;
    case 'new':
    default:
      return 1;
  }
}

function getRemainingDailyNewAllowance(
  progressByKanji: SessionProgressSeedByKanji,
  createdAt: string | undefined,
  dailyNewLimit: number | undefined,
): number {
  const todayKey = toLocalDateKey(createdAt ?? new Date().toISOString());
  const consumedTodayCount = Object.values(progressByKanji).filter((progress) =>
    isFirstSeenOnLocalDate(progress, todayKey),
  ).length;

  return Math.max(0, (dailyNewLimit ?? DEFAULT_DAILY_NEW_KANJI_LIMIT) - consumedTodayCount);
}

function hasSeenProgress(progress: SessionProgressSeed | undefined): boolean {
  if (!progress) {
    return false;
  }

  return (progress.seenCount ?? 0) > 0 || progress.confidence !== 'new';
}

function isFirstSeenOnLocalDate(progress: SessionProgressSeed, localDateKey: string): boolean {
  return hasSeenProgress(progress) && progress.firstSeenAt !== undefined && toLocalDateKey(progress.firstSeenAt) === localDateKey;
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
