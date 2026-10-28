import type { RefObject } from 'react';
import type { ViewInstance } from 'react-native';

const focusable = '[tabindex]';

// The row's own focusable element: the row's view, or the first one inside it.
const rowIn = (view: HTMLElement): HTMLElement | null =>
  view.matches(focusable) ? view : view.querySelector<HTMLElement>(focusable);

// Desktop and web: the keyboard's focus moves to the row's own focusable element.
export function focusView(view: RefObject<ViewInstance | null>): void {
  const current = view.current;

  if (current instanceof HTMLElement) rowIn(current)?.focus();
}
