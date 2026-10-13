import { useCallback, useSyncExternalStore } from 'react';
import type { RowHover } from '../../generic/primitives/fields/field-layout';

// Which entry of a list is hovered, read by the row above it alone, so a hover redraws two rows.
export interface HoverStore {
  get: () => number | null;
  set: (index: number | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createHoverStore(): HoverStore {
  let hovered: number | null = null;
  const listeners = new Set<() => void>();
  const set = (index: number | null): void => {
    if (hovered === index) return;
    hovered = index;
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { get: () => hovered, set, subscribe };
}

export function useRowHover(store: HoverStore, index: number): RowHover {
  const below = useSyncExternalStore(
    store.subscribe,
    () => store.get() === index + 1,
  );
  const onHover = useCallback(
    (hovering: boolean) => {
      if (hovering) store.set(index);
      else if (store.get() === index) store.set(null);
    },
    [store, index],
  );
  return { separatorHidden: below, onHover };
}
