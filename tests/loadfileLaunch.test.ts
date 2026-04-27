import { describe, expect, it } from 'vitest';
import {
  getLoadfileSearch,
  getLoadfileLaunchOptions,
  getSlotSearch,
  stripCreateLoadfileFromSearch,
} from '../src/app/loadfileLaunch';

describe('loadfile launch helpers', () => {
  it('detects runner-only loadfile launch flags from the query string', () => {
    expect(getLoadfileLaunchOptions('?loadfile=1&createLoadfile=1&slot=loadfile-2')).toEqual({
      showLoadfile: true,
      createLoadfile: true,
      slotId: 'loadfile-2',
    });
    expect(getLoadfileLaunchOptions('?')).toEqual({
      showLoadfile: false,
      createLoadfile: false,
      slotId: undefined,
    });
  });

  it('builds loadfile-picker and active-slot searches explicitly', () => {
    expect(getLoadfileSearch()).toBe('?loadfile=1');
    expect(getLoadfileSearch('loadfile-2')).toBe('?loadfile=1&slot=loadfile-2');
    expect(getSlotSearch('loadfile-3')).toBe('?slot=loadfile-3');
  });

  it('removes the createLoadfile flag after startup slot creation begins', () => {
    expect(stripCreateLoadfileFromSearch('?loadfile=1&createLoadfile=1')).toBe('?loadfile=1');
    expect(stripCreateLoadfileFromSearch('?createLoadfile=1&slot=loadfile-2')).toBe('?slot=loadfile-2');
  });
});
