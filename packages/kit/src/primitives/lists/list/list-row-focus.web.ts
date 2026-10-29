import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';

const focusable = '[tabindex]';

// The row's own focusable element: the row's view, or the first one inside it.
const rowIn = (view: HTMLElement): HTMLElement | null =>
  view.matches(focusable) ? view : view.querySelector<HTMLElement>(focusable);

const rowOf = (view: RefObject<ViewInstance | null>): HTMLElement | null =>
  view.current instanceof HTMLElement ? rowIn(view.current) : null;

// Nothing holds the focus, as when the focused element left the page.
const focusLost = (): boolean =>
  document.activeElement === null || document.activeElement === document.body;

// Another element holds the focus a row asked `ifLost` would take.
const focusHeld = (ifLost: boolean): boolean => ifLost && !focusLost();

/*
 * Desktop and web: the keyboard's focus moves to the row's own focusable element; with `ifLost`, only while nothing
 * else holds it.
 */
export function focusView(
  view: RefObject<ViewInstance | null>,
  ifLost: boolean,
): void {
  if (focusHeld(ifLost)) return;

  rowOf(view)?.focus();
}
