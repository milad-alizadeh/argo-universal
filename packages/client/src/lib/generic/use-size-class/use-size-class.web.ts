import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useCSSVariable } from 'uniwind';
import { type SizeClass, sizeClass } from './size-class';

type Breakpoint = string | number | undefined;

function cssLength(breakpoint: string | number): string {
  return typeof breakpoint === 'number' ? `${breakpoint}px` : breakpoint;
}

function minWidthQuery(breakpoint: Breakpoint): MediaQueryList | undefined {
  if (typeof window === 'undefined' || breakpoint === undefined) return;

  return window.matchMedia(`(min-width: ${cssLength(breakpoint)})`);
}

function subscribeToChanges(
  mediaQuery: MediaQueryList | undefined,
  listener: () => void,
): () => void {
  mediaQuery?.addEventListener('change', listener);

  return (): void => mediaQuery?.removeEventListener('change', listener);
}

// Whether the window reaches a breakpoint token from tooling/uniwind/theme.css.
function useReaches(token: string): boolean {
  const breakpoint = useCSSVariable(token);
  const mediaQuery = useMemo(() => minWidthQuery(breakpoint), [breakpoint]);

  const subscribe = useCallback(
    (listener: () => void) => subscribeToChanges(mediaQuery, listener),
    [mediaQuery],
  );

  return useSyncExternalStore(
    subscribe,
    () => mediaQuery?.matches ?? false,
    () => false,
  );
}

// The web is never a phone: a narrow browser window is compact by width alone.
export function useSizeClass(): SizeClass {
  return sizeClass({
    medium: useReaches('--breakpoint-medium'),
    wide: useReaches('--breakpoint-wide'),
    phone: false,
  });
}
