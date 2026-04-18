import type { DrillConfig } from './types';

export const STARTER_DRILLS: DrillConfig[] = [
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
  {
    id: 'learn',
    label: 'Learn',
    mode: 'learn',
    deckSize: 5,
    cuePolicy: 'full',
  },
];

export function getDrillById(id: string): DrillConfig {
  const drill = STARTER_DRILLS.find((candidate) => candidate.id === id);

  if (!drill) {
    throw new Error(`Unknown drill config: ${id}`);
  }

  return drill;
}
