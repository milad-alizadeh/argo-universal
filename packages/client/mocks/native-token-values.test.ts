import { toNativeTokenValue } from '@repo/uniwind/native-token-values';
import { describe, expect, it } from 'vitest';

const smallShadowToken = '--shadow-sm';

describe('native theme token values', () => {
  it('preserves radius geometry in native points', () => {
    expect(toNativeTokenValue('--radius', '0.375rem')).toBe(6);
    expect(toNativeTokenValue('--radius', '10px')).toBe(10);
  });

  it('preserves each shadow and its alpha without functional colour tokens', () => {
    expect(
      toNativeTokenValue(
        '--shadow',
        '0px 1px 2px 0px hsl(0 0% 0% / 0.05), 0px 1px 3px -1px rgb(0 0 0 / 0.1)',
      ),
    ).toBe('0px 1px 2px 0px #0000000d, 0px 1px 3px -1px #0000001a');
  });

  it('converts OKLCH inside a shadow to a native colour', () => {
    expect(
      toNativeTokenValue(
        smallShadowToken,
        '0px 1px 2px 0px oklch(1 0 0 / 0.5)',
      ),
    ).toBe('0px 1px 2px 0px #ffffff80');
  });

  it('preserves rem shadow dimensions and negative spread', () => {
    expect(
      toNativeTokenValue(
        smallShadowToken,
        '0 0.125rem 0.5rem -0.0625rem rgba(0, 0, 0, 0.25)',
      ),
    ).toBe('0 2px 8px -1px #00000040');
  });

  it('leaves standalone colours and existing hex shadows intact', () => {
    expect(toNativeTokenValue('--color-primary', 'oklch(0.5 0.1 240)')).toBe(
      'oklch(0.5 0.1 240)',
    );
    expect(
      toNativeTokenValue(smallShadowToken, '0px 1px 2px 0px #0000000d'),
    ).toBe('0px 1px 2px 0px #0000000d');
  });
});
