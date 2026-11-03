import { describe, expect, it } from 'vitest';
import { asidePlace, type AsideRoom } from './screen-aside-place';

// The tokens a wide window reads: the 800 reading column, its 32 inset each side, the 600 medium threshold.
const room = (width: number, wide = true): AsideRoom => ({
  width,
  wide,
  column: 800,
  inset: 32,
  medium: 600,
});

describe('where a Screen draws its aside', () => {
  it('beside the column when the right gutter holds it, at 1920 with the sidebar shown', () => {
    expect(asidePlace(room(1920 - 384 - 8))).toBe('aside');
  });

  it('as Pills under the title when the gutter is too narrow, at 1440 with the sidebar shown', () => {
    expect(asidePlace(room(1440 - 384 - 8))).toBe('pills');
  });

  it('as Pills on a medium window, which has no gutters', () => {
    expect(asidePlace(room(768, false))).toBe('pills');
  });

  it('as icon Pills below medium', () => {
    expect(asidePlace(room(375, false))).toBe('icons');
  });

  it('beside the column from the width where both gutters hold it', () => {
    const threshold = 800 + 2 * 32 + 2 * (280 + 32);

    expect([threshold - 1, threshold].map((w) => asidePlace(room(w)))).toEqual(
      ['pills', 'aside'],
    );
  });

  it('never beside the column below wide, however much room', () => {
    expect(asidePlace(room(2000, false))).toBe('pills');
  });

  it('as Pills until it is measured', () => {
    expect(asidePlace(room(0))).toBe('pills');
  });
});
