import { useCallback, useSyncExternalStore } from 'react';
import { listenerSet } from './listener-set';

/*
 * Which rows of one List end their group. A grouped row with a footer under it closes its card,
 * and the row after it opens a new one, as a footer splits an iOS Settings group.
 */
export interface RowGroupEnds {
  subscribe: (listener: () => void) => () => void;
  ends: (index: number) => boolean;
  mark: (index: number, on: boolean) => void;
}

export function createRowGroupEnds(): RowGroupEnds {
  const ends = new Set<number>();
  const { subscribe, notify } = listenerSet();

  return {
    subscribe,
    ends: (index) => ends.has(index),
    mark(index, on) {
      if (ends.has(index) === on) return;

      if (on) ends.add(index);
      else ends.delete(index);
      notify();
    },
  };
}

const noGroupEnds = createRowGroupEnds();

// True when the row above row `index` ends its group, so this row opens a new one.
export function useOpensGroup(
  groupEnds: RowGroupEnds = noGroupEnds,
  index = 0,
): boolean {
  const opens = useCallback(
    () => groupEnds.ends(index - 1),
    [groupEnds, index],
  );

  return useSyncExternalStore(groupEnds.subscribe, opens, opens);
}
