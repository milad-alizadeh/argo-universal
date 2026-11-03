import { describe, expect, it } from 'vitest';
import { fitCount, naturalWidth } from './fitted-row-fit';

// Three items 40 wide, each "+N" 20 wide, 4 between.
function measured(available: number): Parameters<typeof fitCount>[0] {
  return { widths: [40, 40, 40], counts: [20, 20, 20], available, gap: 4 };
}

describe('fitCount', () => {
  it('shows every item until all are measured', () => {
    expect(
      fitCount({ widths: [40, undefined], counts: [], available: 10, gap: 4 }),
    ).toBe(2);
  });

  it('shows every item when they all fit', () => {
    expect(fitCount(measured(128))).toBe(3);
  });

  it('leaves room for the "+N" Pill', () => {
    expect(fitCount(measured(100))).toBe(1);
  });

  it('folds every item into "+N" when even one does not fit beside it', () => {
    expect(fitCount(measured(30))).toBe(0);
  });
});

describe('naturalWidth', () => {
  it('is every item and the gaps between them', () => {
    expect(naturalWidth([40, 40, 40], 4)).toBe(128);
  });

  it('is unknown until every item is measured', () => {
    expect(naturalWidth([40, undefined], 4)).toBeUndefined();
  });
});
