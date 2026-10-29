import type { LegendListRef } from '@legendapp/list/react-native';
import { useCallback } from 'react';
import { holdRowTop, type ListRef, releaseRowTop } from './keep-place';

/*
 * A frame after a collapsible stops, once the list has the final size: Legend checks the end only on
 * scroll, so check it first, or the stale answer follows the Composer to the end.
 */
const settleNextFrame = (list: ListRef, itemKey: string): number =>
  requestAnimationFrame(() => {
    list.current?.reportContentInset();
    releaseRowTop(list, itemKey);
  });

function setGrownSize(
  ref: LegendListRef,
  itemKey: string,
  height: number,
): void {
  const size = ref.getState().sizes.get(itemKey);

  if (size === undefined) return;
  ref.setItemSize(itemKey, { height: size + height, width: 0 });
}

// An opening row keeps its header where it was while it grows below.
function growItem(list: ListRef, itemKey: string, height: number): void {
  if (height > 0) holdRowTop(list, itemKey);

  if (list.current) setGrownSize(list.current, itemKey, height);
}

export interface CollapsibleMotion {
  onMotionChange: (itemKey: string, moving: boolean) => void;
  onGrow: (itemKey: string, height: number) => void;
}

export function useCollapsibleMotion(list: ListRef): CollapsibleMotion {
  const onMotionChange = useCallback(
    (itemKey: string, moving: boolean) => {
      if (!moving) settleNextFrame(list, itemKey);
    },
    [list],
  );

  // Called in the same frame as the collapsible's own height, so React commits the row and the rows below together; Legend's measure lands a frame late on native.
  const onGrow = useCallback(
    (itemKey: string, height: number) => growItem(list, itemKey, height),
    [list],
  );

  return { onMotionChange, onGrow };
}
