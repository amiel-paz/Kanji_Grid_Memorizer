import { DEFAULT_LEARNER_ID } from '../domain/reviewScheduler/defaults';
import { createLocalStore } from '../lib/localStore';
import { DEFAULT_PROGRESS_STORAGE_KEY } from './progressStore';

const LOADFILE_REGISTRY_STORAGE_KEY = 'kanji-grid-loadfiles-v1';
const DEFAULT_LOADFILE_ID = 'loadfile-1';

export interface LoadfileSlot {
  readonly id: string;
  readonly slotNumber: number;
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
  const slotNumber = findNextAvailableSlotNumber(registry.slots);
  const slotId = getLoadfileId(slotNumber);
  const slot: LoadfileSlot = {
    id: slotId,
    slotNumber,
    label: `Loadfile ${slotNumber}`,
    learnerId: getLoadfileLearnerId(slotNumber),
    progressStorageKey: getLoadfileProgressStorageKey(slotNumber),
    createdAt,
    lastOpenedAt: createdAt,
  };

  return {
    slot,
    registry: {
      ...registry,
      activeLoadfileId: slot.id,
      nextLoadfileNumber: findNextAvailableSlotNumber([...registry.slots, slot]),
      slots: [...registry.slots, slot],
    },
  };
}

export function renameLoadfileSlot(
  registry: LoadfileRegistry,
  slotId: string,
  label: string,
): LoadfileRegistry | null {
  const trimmedLabel = label.trim();

  if (trimmedLabel.length === 0) {
    return null;
  }

  let didRename = false;
  const nextSlots = registry.slots.map((slot) => {
    if (slot.id !== slotId) {
      return slot;
    }

    didRename = true;
    return {
      ...slot,
      label: trimmedLabel,
    };
  });

  if (!didRename) {
    return null;
  }

  return {
    ...registry,
    slots: nextSlots,
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
    slotNumber: 1,
    label: 'Loadfile 1',
    learnerId: DEFAULT_LEARNER_ID,
    progressStorageKey: DEFAULT_PROGRESS_STORAGE_KEY,
    createdAt: now,
    lastOpenedAt: now,
  };
}

function normalizeLoadfileRegistry(registry: LoadfileRegistry): LoadfileRegistry {
  const normalizedSlots = normalizeLoadfileSlots(registry.slots);

  return {
    ...registry,
    activeLoadfileId:
      findLoadfileSlot({ ...registry, slots: normalizedSlots }, registry.activeLoadfileId)?.id ??
      normalizedSlots[0]?.id ??
      '',
    nextLoadfileNumber: Math.max(
      registry.nextLoadfileNumber,
      findNextAvailableSlotNumber(normalizedSlots),
      2,
    ),
    slots: normalizedSlots,
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
    (value.slotNumber === undefined || isPositiveInteger(value.slotNumber)) &&
    typeof value.label === 'string' &&
    typeof value.learnerId === 'string' &&
    typeof value.progressStorageKey === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.lastOpenedAt === undefined || typeof value.lastOpenedAt === 'string')
  );
}

function normalizeLoadfileSlots(slots: readonly LoadfileSlot[]): LoadfileSlot[] {
  const usedSlotNumbers = new Set<number>();

  return slots.map((slot) => {
    const preferredSlotNumber = getPreferredSlotNumber(slot);
    const slotNumber = claimSlotNumber(usedSlotNumbers, preferredSlotNumber);

    return {
      ...slot,
      slotNumber,
    };
  });
}

function getPreferredSlotNumber(slot: LoadfileSlot): number {
  if (isPositiveInteger(slot.slotNumber)) {
    return slot.slotNumber;
  }

  return (
    parseTrailingNumber(slot.id, /^loadfile-(\d+)$/) ??
    parseTrailingNumber(slot.learnerId, /^local-learner-(\d+)$/) ??
    (slot.learnerId === DEFAULT_LEARNER_ID ? 1 : undefined) ??
    parseTrailingNumber(slot.label, /^Loadfile (\d+)$/) ??
    1
  );
}

function findNextAvailableSlotNumber(slots: readonly LoadfileSlot[]): number {
  const usedSlotNumbers = new Set(
    normalizeLoadfileSlots(slots).map((slot) => slot.slotNumber),
  );

  return claimSlotNumber(usedSlotNumbers, 1);
}

function claimSlotNumber(usedSlotNumbers: Set<number>, preferredSlotNumber: number): number {
  let slotNumber = Math.max(1, preferredSlotNumber);

  while (usedSlotNumbers.has(slotNumber)) {
    slotNumber += 1;
  }

  usedSlotNumbers.add(slotNumber);
  return slotNumber;
}

function getLoadfileId(slotNumber: number): string {
  return `loadfile-${slotNumber}`;
}

function getLoadfileLearnerId(slotNumber: number): string {
  return slotNumber === 1 ? DEFAULT_LEARNER_ID : `local-learner-${slotNumber}`;
}

function getLoadfileProgressStorageKey(slotNumber: number): string {
  return slotNumber === 1
    ? DEFAULT_PROGRESS_STORAGE_KEY
    : `${DEFAULT_PROGRESS_STORAGE_KEY}:${getLoadfileId(slotNumber)}`;
}

function parseTrailingNumber(value: string, pattern: RegExp): number | undefined {
  const match = value.match(pattern);

  if (!match) {
    return undefined;
  }

  const parsed = Number.parseInt(match[1] ?? '', 10);
  return isPositiveInteger(parsed) ? parsed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
