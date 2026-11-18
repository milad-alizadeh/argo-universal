import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  type FeedEntry,
  type LiveHeaderEntry,
  liveHeaderEntry,
  liveHeaderKey,
} from './feed-entry';

interface LiveState {
  sessionId?: string;
  active?: LiveHeaderEntry;
  turnRunning: boolean;
  keepCell: boolean;
}

interface HeldHeader extends LiveState {
  exiting?: LiveHeaderEntry;
}

type SetHeldHeader = Dispatch<SetStateAction<HeldHeader>>;

const sameActive = (
  first?: LiveHeaderEntry,
  second?: LiveHeaderEntry,
): boolean => first?.liveHeader === second?.liveHeader;

const liveTool = (state: LiveState): LiveHeaderEntry['toolCall'] =>
  state.active?.toolCall;

const sameHeader = (first: LiveState, second: LiveState): boolean =>
  sameActive(first.active, second.active) &&
  liveTool(first) === liveTool(second);

const sameTurn = (first: LiveState, second: LiveState): boolean =>
  first.sessionId === second.sessionId &&
  first.turnRunning === second.turnRunning;

function startExit(
  entry: LiveHeaderEntry,
  setHeld: SetHeldHeader,
): LiveHeaderEntry {
  const exiting: LiveHeaderEntry = {
    ...entry,
    closing: true,
    onExit: (): void =>
      setHeld((held) =>
        held.exiting === exiting ? { ...held, exiting: undefined } : held,
      ),
  };

  return exiting;
}

function closingEntry(
  entry: LiveHeaderEntry,
  live: LiveState,
  setHeld: SetHeldHeader,
): LiveHeaderEntry {
  return live.keepCell
    ? { ...entry, closing: true }
    : startExit(entry, setHeld);
}

function nextHeader(
  held: HeldHeader,
  live: LiveState,
  setHeld: SetHeldHeader,
): HeldHeader {
  if (held.sessionId !== live.sessionId || live.turnRunning) return live;

  return retainOnExit(held.active, live, setHeld);
}

function retainOnExit(
  active: LiveHeaderEntry | undefined,
  live: LiveState,
  setHeld: SetHeldHeader,
): HeldHeader {
  return active
    ? { ...live, exiting: closingEntry(active, live, setHeld) }
    : live;
}

function useHeldHeader(live: LiveState): LiveHeaderEntry | undefined {
  const [held, setHeld] = useState<HeldHeader>(live);

  if (sameTurn(held, live) && sameHeader(held, live)) return held.exiting;

  const next = nextHeader(held, live, setHeld);
  setHeld(next);

  return next.exiting;
}

// Keep the last standalone live header in the same cell while its measured height closes.
export function useExitingLiveHeader(
  entries: FeedEntry[],
  sessionId: string | undefined,
  turnRunning: boolean,
): FeedEntry[] {
  const last = entries.at(-1);
  const exiting = useHeldHeader(liveState(last, sessionId, turnRunning));

  return useMemo(
    () => (exiting ? [...entries, exiting] : entries),
    [entries, exiting],
  );
}

/*
 * iOS can retarget a pending end scroll when the final cell is deleted. At a successful Turn end,
 * keep the collapsed cell until the next Turn selects a new tail.
 */
const keepClosedCell = (last?: FeedEntry): boolean =>
  Platform.OS === 'ios' && hasSettledTail(last);

const hasSettledTail = (last?: FeedEntry): boolean =>
  last !== undefined && last.type !== 'turn_end';

const liveState = (
  last: FeedEntry | undefined,
  sessionId: string | undefined,
  turnRunning: boolean,
): LiveState => ({
  active: liveHeaderEntry(last),
  sessionId,
  turnRunning,
  keepCell: keepClosedCell(last),
});

function liveHeaderNeedsMeasurement(list: LegendListRef): boolean {
  const state = list.getState();
  const index = state.indexByKey(liveHeaderKey);

  return index !== undefined && !state.elementAtIndex(index);
}

function closeUnrenderedHeader(
  list: LegendListRef,
  entry: LiveHeaderEntry,
): void {
  if (!liveHeaderNeedsMeasurement(list)) return;

  if (entry.onExit) entry.onExit();
  else list.setItemSize(liveHeaderKey, { width: 0, height: 0 });
}

// There is no animation to wait for when the reader is far above the closing cell.
export function useCloseUnrenderedLiveHeader(
  list: RefObject<LegendListRef | null>,
  last?: FeedEntry,
): void {
  const entry = liveHeaderEntry(last);
  useEffect(() => {
    if (!entry?.closing) return;

    const frame = requestAnimationFrame(() => {
      if (list.current) closeUnrenderedHeader(list.current, entry);
    });

    return (): void => cancelAnimationFrame(frame);
  }, [list, entry]);
}
