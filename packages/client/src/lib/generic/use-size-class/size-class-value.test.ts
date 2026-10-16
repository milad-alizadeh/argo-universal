import { describe, expect, it } from 'vitest';
import { sizeClassValue } from './size-class-value';

describe('a size-class value', (): void => {
  it.each(['compact', 'medium', 'wide'] as const)(
    'is the same plain value when %s',
    (sizeClass): void => {
      expect(sizeClassValue('body', sizeClass)).toBe('body');
    },
  );

  it.each([
    ['compact', 'secondary'],
    ['medium', 'secondary'],
    ['wide', 'body'],
  ] as const)(
    'picks the %s entry, medium following compact',
    (sizeClass, expected): void => {
      expect(
        sizeClassValue({ compact: 'secondary', wide: 'body' }, sizeClass),
      ).toBe(expected);
    },
  );

  it('keeps a plain object value whole', (): void => {
    const style = { paddingTop: 8 };

    expect(sizeClassValue(style, 'wide')).toBe(style);
  });
});
