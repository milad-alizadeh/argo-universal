import { useCallback, useSyncExternalStore } from 'react';
import { listenerSet } from './listener-set';
import { createRowGroupEnds, type RowGroupEnds } from './row-group-ends';

export type HighlightReason = 'hover' | 'press' | 'selected';

/*
 * Which rows of one List are hovered, pressed or selected. A highlighted row covers the separators
 * either side of it, as an iOS cell's highlight does, so its own and the row above's both hide.
 */
export interface RowHighlights {
  subscribe: (listener: () => void) => () => void;
  highlighted: (index: number) => boolean;
  mark: (index: number, reason: HighlightReason, on: boolean) => void;
  clear: (index: number) => void;
  // The rows that end their group, kept beside the highlights each List already holds.
  groupEnds: RowGroupEnds;
}

type Marks = Map<number, Set<HighlightReason>>;

function reasonsAt(marks: Marks, index: number): Set<HighlightReason> {
  const reasons = marks.get(index) ?? new Set<HighlightReason>();

  marks.set(index, reasons);

  return reasons;
}

// Returns whether the reason changed.
function toggle(
  reasons: Set<HighlightReason>,
  reason: HighlightReason,
  on: boolean,
): boolean {
  if (reasons.has(reason) === on) return false;

  if (on) reasons.add(reason);
  else reasons.delete(reason);

  return true;
}

export function createRowHighlights(): RowHighlights {
  const marks: Marks = new Map();
  const { subscribe, notify } = listenerSet();

  return {
    subscribe,
    highlighted: (index) => (marks.get(index)?.size ?? 0) > 0,
    mark(index, reason, on) {
      if (toggle(reasonsAt(marks, index), reason, on)) notify();
    },
    clear(index) {
      if (marks.delete(index)) notify();
    },
    groupEnds: createRowGroupEnds(),
  };
}

const noHighlights = createRowHighlights();

const coversSeparator = (highlights: RowHighlights, index: number): boolean =>
  highlights.highlighted(index) || highlights.highlighted(index + 1);

// True when the separator under row `index` sits against a highlighted row, above or below it.
export function useSeparatorCovered(
  highlights: RowHighlights = noHighlights,
  index = -1,
): boolean {
  const covered = useCallback(
    () => coversSeparator(highlights, index),
    [highlights, index],
  );

  return useSyncExternalStore(highlights.subscribe, covered, covered);
}
