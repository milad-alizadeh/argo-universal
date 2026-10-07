import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useCSSVariable } from 'uniwind';

export function useWide(): boolean {
  const breakpoint = useCSSVariable('--breakpoint-wide');
  const mediaQuery = useMemo(() => {
    if (typeof window === 'undefined' || breakpoint === undefined) return;
    const minimumWidth =
      typeof breakpoint === 'number' ? `${breakpoint}px` : breakpoint;
    return window.matchMedia(`(min-width: ${minimumWidth})`);
  }, [breakpoint]);
  const subscribe = useCallback(
    (listener: () => void) => {
      mediaQuery?.addEventListener('change', listener);
      return () => mediaQuery?.removeEventListener('change', listener);
    },
    [mediaQuery],
  );
  return useSyncExternalStore(
    subscribe,
    () => mediaQuery?.matches ?? false,
    () => false,
  );
}
