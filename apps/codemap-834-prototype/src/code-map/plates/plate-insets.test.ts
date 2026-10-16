import { describe, expect, it } from 'vitest';
import { insetsFrom, type Rect } from './plate-insets';

// The map's box sits 100 px down the page: 1000 × 800, so its middle is y 500.
const box: Rect = { top: 100, right: 1000, bottom: 900, left: 0 };

function plate(top: number, height: number, left = 12): Rect {
  return { top, right: left + 200, bottom: top + height, left };
}

describe('plate insets', () => {
  it('has no bands when nothing lies over the map', () => {
    expect(insetsFrom(box, [])).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('covers the map down to the bottom edge of a plate in its upper half', () => {
    expect(insetsFrom(box, [plate(112, 43)]).top).toBe(55);
  });

  it('covers the map up to the top edge of a plate in its lower half', () => {
    expect(insetsFrom(box, [plate(730, 158)]).bottom).toBe(170);
  });

  it('takes the deepest plate on each side', () => {
    const plates = [plate(730, 158), plate(770, 118, 780), plate(112, 43)];

    expect(insetsFrom(box, plates)).toMatchObject({ top: 55, bottom: 170 });
  });

  it.each([
    ['above the map', plate(20, 40)],
    ['below the map', plate(920, 40)],
    ['with no size', plate(300, 0)],
  ])('ignores a plate %s', (_, outside) => {
    expect(insetsFrom(box, [outside])).toMatchObject({ top: 0, bottom: 0 });
  });
});
