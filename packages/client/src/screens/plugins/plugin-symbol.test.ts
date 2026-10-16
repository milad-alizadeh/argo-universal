import { describe, expect, it } from 'vitest';
import { pluginSymbol } from './plugin-symbol';

describe('pluginSymbol', () => {
  it('draws every name a Plugin gives', () => {
    expect(
      pluginSymbol({
        sf: 'ticket',
        sfFilled: 'ticket.fill',
        material: 'confirmation_number',
      }),
    ).toEqual({
      sf: 'ticket',
      sfFilled: 'ticket.fill',
      material: 'confirmation_number',
    });
  });

  it.each([
    {
      icon: { material: 'extension' },
      drawn: { sf: 'powerplug', material: 'extension' },
    },
    {
      icon: { sf: 'puzzlepiece.extension' },
      drawn: { sf: 'puzzlepiece.extension', material: 'power' },
    },
  ] as const)(
    'draws the Plugin icon on platforms without a name: $icon',
    ({ icon, drawn }) => {
      expect(pluginSymbol(icon)).toEqual(drawn);
    },
  );
});
