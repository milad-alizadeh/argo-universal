import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';

type ListRef = RefObject<LegendListRef | null>;

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
  setMoving: Dispatch<SetStateAction<number>>,
): number =>
  requestAnimationFrame(() => {
    list.current?.reportContentInset();
    setMoving(oneFewer);
  });

// While any collapsible is opening or closing, the Feed holds still.
function useMovingCollapsibles(
  list: ListRef,
): [number, (started: boolean) => void] {
  const [moving, setMoving] = useState(0);
  const onMotionChange = useCallback(
    (started: boolean) => {
      if (started) setMoving(oneMore);
      else settleNextFrame(list, setMoving);
    },
    [list],
  );
  return [moving, onMotionChange];
}

function growItem(
  ref: LegendListRef | null,
  itemKey: string,
  height: number,
): void {
  if (!ref) return;
  const size = ref.getState().sizes.get(itemKey);
  if (size === undefined) return;
  ref.setItemSize(itemKey, { height: size + height, width: 0 });
}

export interface CollapsibleMotion {
  maintainScrollAtEnd: typeof followEnd | typeof holdEnd;
  onMotionChange: (moving: boolean) => void;
  onGrow: (itemKey: string, height: number) => void;
}

export function useCollapsibleMotion(list: ListRef): CollapsibleMotion {
  const [moving, onMotionChange] = useMovingCollapsibles(list);
  // Called in the same frame as the collapsible's own height, so React commits the row and the rows below together; Legend's measure lands a frame late on native.
  const onGrow = useCallback(
    (itemKey: string, height: number) =>
      growItem(list.current, itemKey, height),
    [list],
  );
  return {
    maintainScrollAtEnd: moving ? holdEnd : followEnd,
    onMotionChange,
    onGrow,
  };
}
