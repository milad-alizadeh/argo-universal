import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';
import { holdRowTop, type ListRef, releaseRowTop } from './keep-place';

/*
 * Streaming rows grow at the end, so the Feed follows rows as they measure. The end clearance is the
 * footer, which grows with a glass Composer, so the Feed follows the footer too.
 */
const followEnd = {
  on: { dataChange: true, layout: true, itemLayout: true, footerLayout: true },
};

// While a reader opens or closes a collapsible it holds still, so opening one at the end grows below instead of scrolling the page up.
const holdEnd = { on: { dataChange: true, layout: true, footerLayout: true } };

const oneMore = (count: number): number => count + 1;

const oneFewer = (count: number): number => count - 1;

// A frame later, once the list has the final size: Legend checks the end only on scroll, so check it first, or the stale answer follows to the end.
const settleNextFrame = (
  list: ListRef,
  itemKey: string,
  setMoving: Dispatch<SetStateAction<number>>,
): number =>
  requestAnimationFrame(() => {
    list.current?.reportContentInset();
    releaseRowTop(list, itemKey);
    setMoving(oneFewer);
  });

// While any collapsible is opening or closing, the Feed holds still.
function useMovingCollapsibles(
  list: ListRef,
): [number, CollapsibleMotion['onMotionChange']] {
  const [moving, setMoving] = useState(0);

  const onMotionChange = useCallback(
    (itemKey: string, started: boolean) => {
      if (started) setMoving(oneMore);
      else settleNextFrame(list, itemKey, setMoving);
    },
    [list],
  );

  return [moving, onMotionChange];
}

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
  maintainScrollAtEnd: typeof followEnd | typeof holdEnd;
  onMotionChange: (itemKey: string, moving: boolean) => void;
  onGrow: (itemKey: string, height: number) => void;
}

export function useCollapsibleMotion(list: ListRef): CollapsibleMotion {
  const [moving, onMotionChange] = useMovingCollapsibles(list);

  // Called in the same frame as the collapsible's own height, so React commits the row and the rows below together; Legend's measure lands a frame late on native.
  const onGrow = useCallback(
    (itemKey: string, height: number) => growItem(list, itemKey, height),
    [list],
  );

  return {
    maintainScrollAtEnd: moving ? holdEnd : followEnd,
    onMotionChange,
    onGrow,
  };
}
