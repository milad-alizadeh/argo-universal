import { describe, expect, it } from 'vitest';
import { pluginSymbol } from './plugin-symbol';

describe('pluginSymbol', () => {
  it('draws both names a Plugin gives', () => {
    expect(
      pluginSymbol({ sf: 'ticket', material: 'confirmation_number' }),
    ).toEqual({
      sf: 'ticket',
      material: 'confirmation_number',
    });
  });

  it('draws the Plugin icon on a platform the Plugin gives no name for', () => {
    expect(pluginSymbol({ material: 'extension' })).toEqual({
      sf: 'powerplug',
      material: 'extension',
    });
    expect(pluginSymbol({ sf: 'puzzlepiece.extension' })).toEqual({
      sf: 'puzzlepiece.extension',
      material: 'power',
    });
  });
});
