import { describe, expect, it } from 'vitest';
import { iosImage, iosSystemName } from './ios-image';

describe('iosImage', () => {
  it('names a system icon by its SF Symbol', () => {
    expect(iosImage('menu')).toEqual({
      kind: 'system',
      name: 'line.3.horizontal',
    });
  });

  it('takes the filled SF Symbol when asked', () => {
    expect(
      iosImage(
        { sf: 'heart', sfFilled: 'heart.fill', material: 'favorite' },
        true,
      ),
    ).toEqual({
      kind: 'system',
      name: 'heart.fill',
    });
  });

  it('names Argo’s own symbol as an asset image', () => {
    expect(iosImage('agent')).toEqual({
      kind: 'asset',
      name: 'custom.robot',
    });
  });

  it('draws nothing for an SVG icon', () => {
    expect(iosImage('commit')).toBeUndefined();
  });

  it('offers a system name only for a system icon', () => {
    expect(iosSystemName('menu')).toBe('line.3.horizontal');
    expect(iosSystemName('agent')).toBeUndefined();
    expect(iosSystemName('commit')).toBeUndefined();
  });
});
