import type { KeyboardEvent } from 'react';

// The keys that step through a list's rows: the arrows one row, Home and End to either end.
const directions = new Map([
  ['ArrowDown', 1],
  ['ArrowUp', -1],
  ['Home', -Infinity],
  ['End', Infinity],
]);

// Moves focus to the row the key reaches; focus outside the rows enters at the first or last.
export function moveFocusAmong(
  event: KeyboardEvent,
  rows: readonly HTMLElement[],
): void {
  const direction = directions.get(event.key);

  if (direction === undefined) return;

  const index = rows.findIndex((row) => row === document.activeElement);
  const next = Math.min(rows.length - 1, Math.max(0, index + direction));

  event.preventDefault();
  rows[next]?.focus();
}
