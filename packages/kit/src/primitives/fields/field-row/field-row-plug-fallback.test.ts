import { describe, expect, it } from 'vitest';
import { type IconSymbol, resolveIcon } from '../../../symbols/icon-symbol';
import { withPlugFallback } from './field-row-plug-fallback';

// Drawings exist for Argo's own names only, as on Android; the plug is Material's power.
const drawings = new Map([
  ['adjust', 'adjust-drawing'],
  ['power', 'plug-drawing'],
]);

const draw = (icon: IconSymbol): string | undefined =>
  drawings.get(resolveIcon(icon).key);

describe('withPlugFallback', () => {
  it('draws nothing for a row with no leading icon', () => {
    expect(withPlugFallback(undefined, draw)).toBeUndefined();
  });

  it('draws the icon when it has a drawing', () => {
    expect(
      withPlugFallback({ sf: 'record.circle', material: 'adjust' }, draw),
    ).toBe('adjust-drawing');
  });

  it('draws the plug when the icon has no drawing', () => {
    expect(withPlugFallback({ sf: 'key', material: 'key' }, draw)).toBe(
      'plug-drawing',
    );
  });
});
