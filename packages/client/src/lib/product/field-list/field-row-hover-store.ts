import { useCallback, useSyncExternalStore } from 'react';
import type { RowHover } from '#primitives/lists/list-item/list-item-position';

type Shade = 'hovered' | 'pressed';

// Which entries of a list are hovered and pressed, read by the row above each alone, so a change redraws two rows.
export interface HoverStore {
  get: (shade: Shade) => number | null;
  // Shades an entry, or clears the shade when that entry still holds it.
  shade: (shade: Shade, index: number, on: boolean) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createHoverStore(): HoverStore {
  const shaded: Record<Shade, number | null> = { hovered: null, pressed: null };
  const listeners = new Set<() => void>();

  const shade = (kind: Shade, index: number, on: boolean): void => {
    const next = nextShaded(shaded[kind], index, on);

    if (shaded[kind] === next) return;

    shaded[kind] = next;

    for (const listener of listeners) listener();
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  };

  return { get: (kind) => shaded[kind], shade, subscribe };
}

// An entry turning on takes the shade; one turning off clears it only while it still holds it.
function nextShaded(
  current: number | null,
  index: number,
  on: boolean,
): number | null {
  if (on) return index;

  return current === index ? null : current;
}

export function useRowHover(store: HoverStore, index: number): RowHover {
  const below = useSyncExternalStore(store.subscribe, () =>
    [store.get('hovered'), store.get('pressed')].includes(index + 1),
  );

  return {
    separatorHidden: below,
    onHover: useShade(store, 'hovered', index),
    onPressing: useShade(store, 'pressed', index),
  };
}

function useShade(
  store: HoverStore,
  kind: Shade,
  index: number,
): (on: boolean) => void {
  return useCallback(
    (on: boolean) => store.shade(kind, index, on),
    [store, kind, index],
  );
}
