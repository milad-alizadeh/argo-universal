import { describe, expect, it } from 'vitest';
import { sizeClass } from './size-class';

describe('the size class', (): void => {
  it.each([
    ['compact', { medium: false, wide: false }],
    ['medium', { medium: true, wide: false }],
    ['wide', { medium: true, wide: true }],
  ] as const)('is %s by window width', (expected, reached): void => {
    expect(sizeClass({ ...reached, phone: false })).toBe(expected);
  });

  it.each([
    ['portrait', { medium: false, wide: false }],
    ['landscape', { medium: true, wide: false }],
    ['a window past the wide breakpoint', { medium: true, wide: true }],
  ] as const)('is compact on a phone in %s', (_, reached): void => {
    expect(sizeClass({ ...reached, phone: true })).toBe('compact');
  });
});
