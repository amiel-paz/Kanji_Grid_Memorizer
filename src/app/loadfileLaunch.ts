const LOADFILE_QUERY_KEY = 'loadfile';
const CREATE_LOADFILE_QUERY_KEY = 'createLoadfile';
const SLOT_QUERY_KEY = 'slot';

export interface LoadfileLaunchOptions {
  readonly showLoadfile: boolean;
  readonly createLoadfile: boolean;
  readonly slotId?: string;
}

export function getLoadfileLaunchOptions(search: string): LoadfileLaunchOptions {
  const params = new URLSearchParams(search);
  const slotId = params.get(SLOT_QUERY_KEY) ?? undefined;

  return {
    showLoadfile: params.get(LOADFILE_QUERY_KEY) === '1',
    createLoadfile: params.get(CREATE_LOADFILE_QUERY_KEY) === '1',
    slotId,
  };
}

export function getLoadfileSearch(slotId?: string): string {
  const params = new URLSearchParams();
  params.set(LOADFILE_QUERY_KEY, '1');

  if (slotId) {
    params.set(SLOT_QUERY_KEY, slotId);
  }

  return `?${params.toString()}`;
}

export function getSlotSearch(slotId: string): string {
  const params = new URLSearchParams();
  params.set(SLOT_QUERY_KEY, slotId);
  return `?${params.toString()}`;
}

export function stripCreateLoadfileFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(CREATE_LOADFILE_QUERY_KEY);

  const nextQuery = params.toString();

  return nextQuery.length > 0 ? `?${nextQuery}` : '';
}
