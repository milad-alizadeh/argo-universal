import { describe, expect, it } from 'vitest';
import {
  type AsideLayout,
  asideLayout,
  type AsideRoom,
} from './screen-aside-place';

// The tokens a wide window reads: the 800 reading column, its 32 inset each side, the 600 medium threshold.
const room = (width: number, wide = true, column = 800): AsideRoom => ({
  width,
  wide,
  column,
  inset: 32,
  medium: 600,
});

// The App's Screen beside its sidebar (384) or its rail alone (72), as measured on web.
const sidebarShown = (window: number): number => window - 384;

const sidebarHidden = (window: number): number => window - 72;

const placeAt = (width: number): string => asideLayout(room(width)).place;

const columnAt = (width: number): AsideLayout['column'] =>
  asideLayout(room(width)).column;

describe('where a Screen draws its aside', () => {
  it('beside the column at 1440 with the sidebar shown', () => {
    expect(placeAt(sidebarShown(1440))).toBe('aside');
  });

  it('beside the column at 1280 with the sidebar hidden', () => {
    expect(placeAt(sidebarHidden(1280))).toBe('aside');
  });

  it('beside the column at 1920, sidebar shown or hidden', () => {
    expect([sidebarShown(1920), sidebarHidden(1920)].map(placeAt)).toEqual([
      'aside',
      'aside',
    ]);
  });

  it('as Pills at 1280 with the sidebar shown, where the column beside it would read narrower than a tablet', () => {
    expect(placeAt(sidebarShown(1280))).toBe('pills');
  });

  it('beside the column from the width that leaves it the medium width', () => {
    const threshold = 600 + 3 * 32 + 280;

    expect([threshold - 1, threshold].map(placeAt)).toEqual(['pills', 'aside']);
  });

  it('as Pills on a medium window, which has no gutters', () => {
    expect(asideLayout(room(768, false)).place).toBe('pills');
  });

  it('as icon Pills below medium', () => {
    expect(asideLayout(room(375, false)).place).toBe('icons');
  });

  it('never beside the column below wide, however much room', () => {
    expect(asideLayout(room(2000, false)).place).toBe('pills');
  });

  it('as Pills until it is measured', () => {
    expect(placeAt(0)).toBe('pills');
  });
});

describe('the column beside the aside', () => {
  it('narrows below its cap and keeps its left inset at 1440 with the sidebar shown', () => {
    const width = sidebarShown(1440);

    expect(columnAt(width)).toEqual({ left: 32, right: 32 + 280 + 32 });
  });

  it('keeps its cap and moves left of centre only as far as the aside needs', () => {
    const width = sidebarHidden(1440);
    const column = columnAt(width);

    expect(column).toEqual({ left: width - 800 - 344, right: 344 });
  });

  it('stays centred once both gutters hold the aside, as a page without one is', () => {
    const width = sidebarShown(1920);

    expect(columnAt(width)).toEqual({
      left: (width - 800) / 2,
      right: (width - 800) / 2,
    });
  });

  it('moves nowhere while the aside draws as Pills', () => {
    expect(columnAt(sidebarShown(1280))).toBeUndefined();
  });

  it('holds a narrow page to its own cap', () => {
    const width = sidebarShown(1440);
    const narrow = asideLayout(room(width, true, 448));

    expect(narrow).toEqual({
      place: 'aside',
      column: { left: width - 448 - 344, right: 344 },
    });
  });
});
