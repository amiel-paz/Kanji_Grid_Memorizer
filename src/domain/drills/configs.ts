import type { DrillConfig } from '../types';

export const STARTER_DRILLS: DrillConfig[] = [
  {
    id: 'learn',
    label: 'Learn',
    mode: 'learn',
    deckSize: 5,
    cuePolicy: 'full',
  },
  {
    id: 'recognize-from-grid',
    label: 'Recognize from grid',
    mode: 'recognize-from-grid',
    deckSize: 5,
    cuePolicy: 'full',
  },
  {
    id: 'match-grid-to-kanji',
    label: 'Match grid to kanji',
    mode: 'match-grid-to-kanji',
    deckSize: 5,
    cuePolicy: 'full',
  },
  {
    id: 'faded-recall',
    label: 'Faded recall',
    mode: 'faded-recall',
    deckSize: 5,
    cuePolicy: 'session-dim',
  },
  {
    id: 'blind-recall',
    label: 'Blind recall',
    mode: 'blind-recall',
    deckSize: 5,
    cuePolicy: 'hidden',
  },
];

export function getDrillById(id: string): DrillConfig {
  const drill = STARTER_DRILLS.find((candidate) => candidate.id === id);

  if (!drill) {
    throw new Error(`Unknown drill config: ${id}`);
  }

  return drill;
}
