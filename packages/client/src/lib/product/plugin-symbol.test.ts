import { describe, expect, it } from 'vitest';
import { manifestIcon, manifestSymbol, pluginSymbol } from './plugin-symbol';

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

describe('manifestIcon', () => {
  const markup = '<svg fill="currentColor"/>';

  it("draws the Plugin's own markup when the Server sent it", () => {
    expect(manifestIcon({ svg: 'icon.svg', sf: 'ticket' }, markup)).toEqual({
      markup,
    });
  });

  it('draws the symbol names, never the file path, when there is no markup', () => {
    expect(manifestIcon({ svg: 'icon.svg', sf: 'ticket' })).toEqual({
      sf: 'ticket',
      material: 'power',
    });
  });
});

describe('manifestSymbol', () => {
  it("draws Argo's Plugin icon where only a symbol draws, for a Plugin that gave only its own SVG", () => {
    expect(manifestSymbol({ svg: 'icon.svg' })).toEqual({
      sf: 'powerplug',
      material: 'power',
    });
  });
});
