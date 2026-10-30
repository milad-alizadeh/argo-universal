interface Point {
  x: number;
  y: number;
}

export function centreOf(box: DOMRect): Point {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// The topmost element a person would point at, as a click there would hit it.
export function topmostAt({ x, y }: Point): Element | null {
  return document.elementFromPoint(x, y);
}

/*
 * Where a person would point at the element: its first line box. An inline element that wraps across lines has a
 * bounding box whose centre falls on the text beside it, not on the element itself.
 */
export const pointableAt = (element: Element): Point =>
  centreOf(element.getClientRects()[0] ?? element.getBoundingClientRect());

// Whether a person can see and point at the element there, rather than something covering or clipping it.
export function canPointAt(
  element: Element,
  point: Point = pointableAt(element),
): boolean {
  const hit = topmostAt(point);

  return hit !== null && element.contains(hit);
}
