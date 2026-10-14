import { useCallback, useSyncExternalStore } from 'react';
import type { RowHover } from '../../generic/primitives/fields/field-layout';

type Shade = 'hovered' | 'pressed';

// Which entries of a list are hovered and pressed, read by the row above each alone, so a change redraws two rows.
export interface HoverStore {
  get: (shade: Shade) => number | null;
  set: (shade: Shade, index: number | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createHoverStore(): HoverStore {
  const shaded: Record<Shade, number | null> = { hovered: null, pressed: null };
  const listeners = new Set<() => void>();

  const set = (shade: Shade, index: number | null): void => {
    if (shaded[shade] === index) return;
    shaded[shade] = index;

    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  };

  return { get: (shade) => shaded[shade], set, subscribe };
}

export function useRowHover(store: HoverStore, index: number): RowHover {
  const below = useSyncExternalStore(store.subscribe, () =>
    [store.get('hovered'), store.get('pressed')].includes(index + 1),
  );

  const shade = useCallback(
    (kind: Shade, on: boolean) => {
      if (on) store.set(kind, index);
      else if (store.get(kind) === index) store.set(kind, null);
    },
    [store, index],
  );

  return {
    separatorHidden: below,
    onHover: useCallback((on: boolean) => shade('hovered', on), [shade]),
    onPressing: useCallback((on: boolean) => shade('pressed', on), [shade]),
  };
}
