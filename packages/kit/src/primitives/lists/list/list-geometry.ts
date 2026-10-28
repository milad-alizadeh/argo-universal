// A drag hit-tests and draws in window coordinates.
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// A drawn row, measured in the window.
export interface MeasuredRow {
  id: string;
  rect: Rect;
}

export const bottom = (rect: Rect): number => rect.y + rect.height;

export const middle = (rect: Rect): number => rect.y + rect.height / 2;

const within = (at: number, start: number, size: number): boolean =>
  at >= start && at <= start + size;

export const inside = (rect: Rect, { x, y }: Point): boolean =>
  within(x, rect.x, rect.width) && within(y, rect.y, rect.height);
