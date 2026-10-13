import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useCSSVariable } from 'uniwind';

type Breakpoint = string | number | undefined;

function cssLength(breakpoint: string | number): string {
  return typeof breakpoint === 'number' ? `${breakpoint}px` : breakpoint;
}

function wideQuery(breakpoint: Breakpoint): MediaQueryList | undefined {
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

export function useWide(): boolean {
  const breakpoint = useCSSVariable('--breakpoint-wide');
  const mediaQuery = useMemo(() => wideQuery(breakpoint), [breakpoint]);
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
