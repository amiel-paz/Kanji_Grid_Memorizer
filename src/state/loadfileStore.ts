import { DEFAULT_LEARNER_ID } from '../domain/reviewScheduler/defaults';
import { createLocalStore } from '../lib/localStore';
import { DEFAULT_PROGRESS_STORAGE_KEY } from './progressStore';

const LOADFILE_REGISTRY_STORAGE_KEY = 'kanji-grid-loadfiles-v1';
const DEFAULT_LOADFILE_ID = 'loadfile-1';

export interface LoadfileSlot {
  readonly id: string;
  readonly label: string;
  readonly learnerId: string;
  readonly progressStorageKey: string;
  readonly createdAt: string;
  readonly lastOpenedAt?: string;
}

export interface LoadfileRegistry {
  readonly version: 1;
  readonly slots: readonly LoadfileSlot[];
  readonly activeLoadfileId: string;
  readonly nextLoadfileNumber: number;
}

export const loadfileRegistryStore = createLocalStore<LoadfileRegistry>(
  LOADFILE_REGISTRY_STORAGE_KEY,
  { validate: isLoadfileRegistry },
);

export function loadLoadfileRegistry(now: string = new Date().toISOString()): LoadfileRegistry {
  const savedRegistry = loadfileRegistryStore.load();

  if (!savedRegistry) {
    return createDefaultLoadfileRegistry(now);
  }

  return normalizeLoadfileRegistry(savedRegistry);
}

export function saveLoadfileRegistry(registry: LoadfileRegistry): boolean {
  return loadfileRegistryStore.save(registry);
}

export function findLoadfileSlot(
  registry: LoadfileRegistry,
  slotId: string | undefined,
): LoadfileSlot | undefined {
  if (!slotId) {
    return undefined;
  }

  return registry.slots.find((slot) => slot.id === slotId);
}

export function getActiveLoadfileSlot(registry: LoadfileRegistry): LoadfileSlot | undefined {
  return findLoadfileSlot(registry, registry.activeLoadfileId) ?? registry.slots[0];
}

export function markLoadfileOpened(
  registry: LoadfileRegistry,
  slotId: string,
  openedAt: string = new Date().toISOString(),
): LoadfileRegistry {
  return {
    ...registry,
    activeLoadfileId: slotId,
    slots: registry.slots.map((slot) =>
      slot.id === slotId
        ? {
            ...slot,
            lastOpenedAt: openedAt,
          }
        : slot,
    ),
  };
}

export function createNewLoadfileSlot(
  registry: LoadfileRegistry,
  createdAt: string = new Date().toISOString(),
): {
  readonly registry: LoadfileRegistry;
  readonly slot: LoadfileSlot;
} {
  const slotNumber = Math.max(1, registry.nextLoadfileNumber);
  const slotId = `loadfile-${slotNumber}`;
  const slot: LoadfileSlot = {
    id: slotId,
    label: `Loadfile ${slotNumber}`,
    learnerId: `local-learner-${slotNumber}`,
    progressStorageKey: `${DEFAULT_PROGRESS_STORAGE_KEY}:${slotId}`,
    createdAt,
    lastOpenedAt: createdAt,
  };

  return {
    slot,
    registry: {
      ...registry,
      activeLoadfileId: slot.id,
      nextLoadfileNumber: slotNumber + 1,
      slots: [...registry.slots, slot],
    },
  };
}

export function deleteLoadfileSlot(
  registry: LoadfileRegistry,
  slotId: string,
): {
  readonly registry: LoadfileRegistry;
  readonly nextActiveSlot?: LoadfileSlot;
} | null {
  const remainingSlots = registry.slots.filter((slot) => slot.id !== slotId);

  if (remainingSlots.length === registry.slots.length) {
    return null;
  }

  const nextActiveSlot =
    findLoadfileSlot({ ...registry, slots: remainingSlots }, registry.activeLoadfileId) ??
    remainingSlots[0];

  return {
    nextActiveSlot,
    registry: {
      ...registry,
      slots: remainingSlots,
      activeLoadfileId: nextActiveSlot?.id ?? '',
    },
  };
}

function createDefaultLoadfileRegistry(now: string): LoadfileRegistry {
  return {
    version: 1,
    activeLoadfileId: DEFAULT_LOADFILE_ID,
    nextLoadfileNumber: 2,
    slots: [createDefaultLoadfileSlot(now)],
  };
}

function createDefaultLoadfileSlot(now: string): LoadfileSlot {
  return {
    id: DEFAULT_LOADFILE_ID,
    label: 'Loadfile 1',
    learnerId: DEFAULT_LEARNER_ID,
    progressStorageKey: DEFAULT_PROGRESS_STORAGE_KEY,
    createdAt: now,
    lastOpenedAt: now,
  };
}

function normalizeLoadfileRegistry(registry: LoadfileRegistry): LoadfileRegistry {
  return {
    ...registry,
    activeLoadfileId:
      findLoadfileSlot(registry, registry.activeLoadfileId)?.id ?? registry.slots[0]?.id ?? '',
    nextLoadfileNumber: Math.max(
      registry.nextLoadfileNumber,
      registry.slots.length > 0 ? registry.slots.length + 1 : 1,
      2,
    ),
  };
}

function isLoadfileRegistry(value: unknown): value is LoadfileRegistry {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version !== 1 || typeof value.activeLoadfileId !== 'string') {
    return false;
  }

  if (
    typeof value.nextLoadfileNumber !== 'number' ||
    value.nextLoadfileNumber < 1 ||
    !Array.isArray(value.slots)
  ) {
    return false;
  }

  return value.slots.every(isLoadfileSlot);
}

function isLoadfileSlot(value: unknown): value is LoadfileSlot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.learnerId === 'string' &&
    typeof value.progressStorageKey === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.lastOpenedAt === undefined || typeof value.lastOpenedAt === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
