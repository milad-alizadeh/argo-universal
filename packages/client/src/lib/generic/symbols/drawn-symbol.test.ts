import { describe, expect, it } from 'vitest';
import { drawnSymbol } from './drawn-symbol';
import type { SystemSymbolSource } from './symbol-source';

const heart: SystemSymbolSource = {
  sf: 'heart',
  sfFilled: 'heart.fill',
  material: 'favorite',
};

const star: SystemSymbolSource = { sf: 'star', material: 'star' };

const filledBolt: SystemSymbolSource = { sf: 'bolt.fill', material: 'bolt' };

describe('drawnSymbol', () => {
  it.each([undefined, false, true])(
    'draws a Tabler source as its one path, with no SF or Material name, when filled is %s',
    (filled) => {
      expect(drawnSymbol({ tabler: 'git-branch' }, filled)).toEqual({
        kind: 'tabler',
        tabler: 'git-branch',
      });
    },
  );

  it.each([
    { source: heart, filled: undefined, sf: 'heart', isFilled: false },
    { source: heart, filled: false, sf: 'heart', isFilled: false },
    { source: heart, filled: true, sf: 'heart.fill', isFilled: true },
    { source: star, filled: true, sf: 'star', isFilled: false },
    { source: filledBolt, filled: undefined, sf: 'bolt.fill', isFilled: true },
  ] as const)(
    'draws $source.sf with filled $filled as SF $sf, keeping its Material name',
    ({ source, filled, sf, isFilled }) => {
      expect(drawnSymbol(source, filled)).toEqual({
        kind: 'system',
        sf,
        material: source.material,
        filled: isFilled,
      });
    },
  );

  it('draws a filled pair from outside the map with its filled SF name but outlined Material', () => {
    expect(drawnSymbol(heart, true, false)).toEqual({
      kind: 'system',
      sf: heart.sfFilled,
      material: heart.material,
      filled: false,
    });
  });
});
