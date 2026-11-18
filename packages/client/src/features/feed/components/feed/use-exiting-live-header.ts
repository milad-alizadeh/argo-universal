import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
    onExit: (): void =>
      setHeld((held) =>
        held.exiting === exiting ? { ...held, exiting: undefined } : held,
      ),
  };

  return exiting;
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
  return active ? { ...live, exiting: startExit(active, setHeld) } : live;
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
  const active = liveHeaderEntry(entries.at(-1));
  const exiting = useHeldHeader({ active, sessionId, turnRunning });

  return useMemo(
    () => (exiting ? [...entries, exiting] : entries),
    [entries, exiting],
  );
}

function liveHeaderRendered(list: LegendListRef | null): boolean {
  if (!list) return false;
  const state = list.getState();
  const index = state.indexByKey(liveHeaderKey);

  return index !== undefined && Boolean(state.elementAtIndex(index));
}

// There is no animation to wait for when the reader is far above the closing cell.
export function useRemoveUnrenderedLiveHeader(
  list: RefObject<LegendListRef | null>,
  last?: FeedEntry,
): void {
  const onExit = liveHeaderEntry(last)?.onExit;
  useEffect(() => {
    if (!onExit) return;

    const frame = requestAnimationFrame(() => {
      if (!liveHeaderRendered(list.current)) onExit();
    });

    return (): void => cancelAnimationFrame(frame);
  }, [list, onExit]);
}
