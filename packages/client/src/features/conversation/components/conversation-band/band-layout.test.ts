import { describe, expect, it } from 'vitest';
import { barLayoutOf, barLeft, barPitch, barWidth } from './band-layout';

const widths = [4, 37, 180, 320, 457, 640, 901];

describe('the bars across the strip', () => {
  it('fills the strip with as many bars as fit', () => {
    for (const width of widths) {
      const { count } = barLayoutOf(width);

      expect(count).toBe(Math.floor((width - barWidth) / barPitch) + 1);
    }
  });

  it('centres the bars, so the same is left over on both sides, and under half a pitch', () => {
    for (const width of widths) {
      const layout = barLayoutOf(width);
      const left = barLeft(0, layout);
      const right = width - (barLeft(layout.count - 1, layout) + barWidth);

      expect(left).toBeCloseTo(right, 6);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThan(barPitch / 2);
    }
  });

  it('spaces the bars evenly', () => {
    const layout = barLayoutOf(500);

    expect(barLeft(1, layout) - barLeft(0, layout)).toBe(barPitch);
    expect(barLeft(31, layout) - barLeft(30, layout)).toBe(barPitch);
  });

  it('draws no bar where there is no room', () => {
    expect(barLayoutOf(0).count).toBe(0);
    expect(barLayoutOf(barWidth - 1).count).toBe(0);
  });
});
