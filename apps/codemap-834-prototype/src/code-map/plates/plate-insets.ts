/*
 * The bands of the map that plates cover. A plate is anything laid over the map: the page's own
 * controls beside the Code Map and the Code Map's camera plate. Labels stay out of these bands.
 */
import type { Insets } from '../labels/map-labels';

/** A box in page pixels, as the browser measures it. */
export interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function over(box: Rect, plate: Rect): boolean {
  const width =
    Math.min(box.right, plate.right) - Math.max(box.left, plate.left);

  const height =
    Math.min(box.bottom, plate.bottom) - Math.max(box.top, plate.top);

  return width > 0 && height > 0;
}

function upper(box: Rect, plate: Rect): boolean {
  return plate.top + plate.bottom < box.top + box.bottom;
}

function deepest(depths: number[]): number {
  return Math.max(0, ...depths);
}

/** A plate in the map's upper half covers it down to the plate's bottom edge; one in the lower half, up to its top edge. */
export function insetsFrom(box: Rect, plates: Rect[]): Insets {
  const covering = plates.filter((plate) => over(box, plate));
  const above = covering.filter((plate) => upper(box, plate));
  const below = covering.filter((plate) => !upper(box, plate));

  return {
    top: deepest(above.map((plate) => plate.bottom - box.top)),
    right: 0,
    bottom: deepest(below.map((plate) => box.bottom - plate.top)),
    left: 0,
  };
}
