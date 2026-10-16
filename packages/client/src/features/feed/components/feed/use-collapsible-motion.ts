import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  holdRowTop,
  type ListRef,
  type ListState,
  releaseRowTop,
} from './keep-place';

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

// Where the Feed was when its first collapsible started moving.
interface MotionStart {
  newest: unknown;
  scroll: number;
  following: boolean;
}

type MotionStartRef = RefObject<MotionStart | null>;

const motionStartOf = (state: ListState): MotionStart => ({
  newest: state.data.at(-1),
  scroll: state.scroll,
  following: state.isWithinMaintainScrollAtEndThreshold,
});

// Only the first of overlapping motions marks where the Feed was.
function markMotionStart(list: ListRef, start: MotionStartRef): void {
  if (list.current) start.current ??= motionStartOf(list.current.getState());
}

// Rows arrived while the Feed followed the end, and the reader did not scroll up meanwhile.
const followedRowsArrived = (state: ListState, start: MotionStart): boolean =>
  start.following &&
  state.data.at(-1) !== start.newest &&
  state.scroll >= start.scroll;

const followsArrivedRows = (
  ref: LegendListRef,
  start: MotionStart | null,
): boolean => !!start && followedRowsArrived(ref.getState(), start);

/*
 * A frame later, once the list has the final size: Legend checks the end only on scroll, so check it
 * first, or the stale answer follows to the end. Rows that arrived while the Feed followed the end can
 * still be measuring, and that check would read them as the reader leaving it, so the Feed follows
 * them to the end instead.
 */
function settleAtEnd(ref: LegendListRef, start: MotionStart | null): void {
  if (followsArrivedRows(ref, start)) void ref.scrollToEnd({ animated: false });
  else ref.reportContentInset();
}

interface Settle {
  list: ListRef;
  itemKey: string;
  start: MotionStartRef;
  setMoving: Dispatch<SetStateAction<number>>;
}

const settleNextFrame = ({ list, itemKey, start, setMoving }: Settle): number =>
  requestAnimationFrame(() => {
    if (list.current) settleAtEnd(list.current, start.current);
    start.current = null;
    releaseRowTop(list, itemKey);
    setMoving(oneFewer);
  });

function startMotion(
  list: ListRef,
  start: MotionStartRef,
  setMoving: Dispatch<SetStateAction<number>>,
): void {
  markMotionStart(list, start);
  setMoving(oneMore);
}

// While any collapsible is opening or closing, the Feed holds still.
function useMovingCollapsibles(
  list: ListRef,
): [number, CollapsibleMotion['onMotionChange']] {
  const [moving, setMoving] = useState(0);
  const start = useRef<MotionStart | null>(null);

  const onMotionChange = useCallback(
    (itemKey: string, started: boolean) => {
      if (started) startMotion(list, start, setMoving);
      else settleNextFrame({ list, itemKey, start, setMoving });
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
