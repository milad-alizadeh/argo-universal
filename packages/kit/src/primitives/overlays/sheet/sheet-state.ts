import { useCallback, useLayoutEffect, useRef } from 'react';
import type { SheetDetent, SheetProps } from './sheet-props';

export function pushPage(path: string[], name: string): string[] {
  return path.at(-1) === name ? path : [...path, name];
}

export function popPage(path: string[]): string[] {
  return path.slice(0, -1);
}

export interface SheetReports {
  // The person closed the sheet: a swipe, the backdrop, Escape or Back.
  dismissed: () => void;
  // The close animation has finished.
  closed: () => void;
}

/*
 * One presentation's reports. A platform may report a dismissal more than once, as SwiftUI does
 * through both its presented state and its dismiss callback; each reaches the caller once. A sheet
 * the app has already closed, such as an answered request, reports no dismissal of its own.
 */
export function sheetReports(read: () => Reported): SheetReports {
  return { dismissed: onceDismissed(read), closed: onceClosed(read) };
}

type Reported = Pick<SheetProps, 'open' | 'onOpenChange' | 'onClosed'>;

function onceDismissed(read: () => Reported): () => void {
  let reported = false;

  return () => {
    if (reported || !read().open) return;
    reported = true;
    read().onOpenChange(false);
  };
}

function onceClosed(read: () => Reported): () => void {
  let reported = false;

  return () => {
    if (reported) return;
    reported = true;
    read().onClosed?.();
  };
}

/*
 * A sheet with pages rests at the system's medium and large heights unless it names its own, as
 * its pages differ in height; a single page without detents is as tall as its content.
 */
export function sheetDetents(
  props: Pick<SheetProps, 'detents'> & { paged: boolean },
): SheetDetent[] | undefined {
  if (props.detents) return props.detents;

  return props.paged ? ['medium', 'large'] : undefined;
}

// Reads the newest props from callbacks that outlive a render.
export function useLatest<Value>(value: Value): () => Value {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });

  return useCallback(() => ref.current, []);
}
