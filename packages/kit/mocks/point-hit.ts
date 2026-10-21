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

// Whether a person can see and point at the element there, rather than something covering or clipping it.
export function canPointAt(
  element: Element,
  point: Point = centreOf(element.getBoundingClientRect()),
): boolean {
  const hit = topmostAt(point);

  return hit !== null && element.contains(hit);
}
