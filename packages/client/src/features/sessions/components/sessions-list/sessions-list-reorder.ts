import { useLayoutEffect, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';
import type { SessionsListEntry } from '../sessions-list-entries';

// How long rows glide and fade after the list's order changes.
const reorderMilliseconds = 250;

function useOrderChanged(entries: SessionsListEntry[]): boolean {
  const entryOrder = entries.map((entry) => entry.id).join('|');
  const [seenOrder, setSeenOrder] = useState(entryOrder);
  const [changed, setChanged] = useState(false);

  if (seenOrder !== entryOrder) {
    setSeenOrder(entryOrder);
    setChanged(true);
  }

  useLayoutEffect(() => {
    if (!changed) return;

    const settle = setTimeout(() => setChanged(false), reorderMilliseconds);

    return (): void => clearTimeout(settle);
  }, [changed, entryOrder]);

  return changed;
}

/*
 * True for a moment after rows appear, leave or move, and never for the first order,
 * so the list shows in place on load and on a tab switch. On native, the change animates into place.
 */
export function useAnimateReorder(entries: SessionsListEntry[]): boolean {
  const animating = useOrderChanged(entries);

  useLayoutEffect(() => {
    if (animating && Platform.OS !== 'web')
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [animating]);

  return animating;
}
