import type { LegendListRef } from '@legendapp/list/react-native';
import { useNewestKeyWhenLeftEnd } from '@repo/kit/primitives/lists/list';
import {
  type RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { type FeedEntry, entryKey } from './feed-entry';
import { type FeedAnchor, scrollMemory } from './feed-scroll-memory';
import { useRestoreFeedAnchor } from './use-restore-feed-anchor';
import { useSeekFeedAnchor } from './use-seek-feed-anchor';

type ListRef = RefObject<LegendListRef | null>;

const containsAnchor = (
  entries: FeedEntry[],
  anchor: FeedAnchor | null,
): boolean =>
  anchor === null || entries.some((entry) => entryKey(entry) === anchor.key);

const seekWindow = (
  input: PositionInput,
): Pick<
  Parameters<typeof useSeekFeedAnchor>[0],
  'oldest' | 'cursor' | 'hasOlder' | 'loadingOlder'
> => ({
  oldest: keyOf(input.entries[0]),
  cursor: input.historyCursor,
  hasOlder: input.hasOlder,
  loadingOlder: input.loadingOlder,
});

function seekInput(
  input: PositionInput & { shown: boolean },
  anchor: FeedAnchor | null,
  open: (anchor: FeedAnchor | null) => void,
): Parameters<typeof useSeekFeedAnchor>[0] {
  return {
    shown: input.shown,
    found: containsAnchor(input.entries, anchor),
    ...seekWindow(input),
    requestOlder: input.onStartReached,
    open: (present): void => open(present ? anchor : null),
  };
}

function useCancelRestoration(
  cancelSeek: () => void,
  cancelRestoration: () => void,
): () => void {
  return useCallback(() => {
    cancelSeek();
    cancelRestoration();
  }, [cancelSeek, cancelRestoration]);
}

function useScrollsToEndWhenShown(
  list: ListRef,
  anchor: FeedAnchor | null,
  input: PositionInput,
): () => void {
  const shown = useScreenFocused() && !input.opensAtStart;
  const restoration = useRestoreFeedAnchor(list, shown);
  const { cancel: cancelRestoration } = restoration;

  const cancelSeek = useSeekFeedAnchor(
    seekInput({ ...input, shown }, anchor, restoration.open),
  );

  return useCancelRestoration(cancelSeek, cancelRestoration);
}

interface Opening {
  initialIndex: number;
  cancelRestore: () => void;
}

function useOpensAtEnd(
  list: ListRef,
  lastIndex: number,
  input: PositionInput,
): Opening {
  const [initialIndex] = useState(input.opensAtStart ? 0 : lastIndex);

  const [anchor] = useState(() =>
    input.sessionId ? scrollMemory.read(input.sessionId) : null,
  );

  const cancelRestore = useScrollsToEndWhenShown(list, anchor, input);

  return { initialIndex, cancelRestore };
}

const keyOf = (entry: FeedEntry | undefined): string | undefined =>
  entry && entryKey(entry);

// The list asks for older rows once until the reader scrolls well away, so a reader still near the top asks again as each page lands.
function useRequestsOlderNearTop(
  list: ListRef,
  oldestKey: string | undefined,
  onStartReached: () => void,
): void {
  const requestOlderIfNearTop = useEffectEvent(() => {
    if (list.current?.getState().isNearStart) onStartReached();
  });

  // Null before the first ask; the Feed always has an oldest row.
  const askedAtOldestKey = useRef<string | null | undefined>(null);
  useEffect(() => {
    if (askedAtOldestKey.current === oldestKey) return;
    askedAtOldestKey.current = oldestKey;
    requestOlderIfNearTop();
  }, [oldestKey]);
}

// Tells `onAtEndChange` whether the end is shown, as the Feed mounts and whenever that changes.
export function useReportsAtEnd(
  atEnd: boolean,
  onAtEndChange: ((atEnd: boolean) => void) | undefined,
): void {
  const report = useEffectEvent(() => onAtEndChange?.(atEnd));
  useEffect(() => report(), [atEnd]);
}

export interface FeedScrollPosition {
  initialIndex: number;
  newestKeyWhenLeftEnd: string | null;
  atEnd: boolean;
  cancelRestore: () => void;
}

const positionAt = (
  opening: Opening,
  newestKeyWhenLeftEnd: string | null,
): FeedScrollPosition => ({
  ...opening,
  newestKeyWhenLeftEnd,
  atEnd: newestKeyWhenLeftEnd === null,
});

interface PositionInput {
  entries: FeedEntry[];
  newestKey: string;
  onStartReached: () => void;
  loadingOlder: boolean;
  hasOlder?: boolean;
  historyCursor?: number | null;
  opensAtStart?: boolean;
  sessionId?: string;
}

// Where the reader is in the Feed: where it opened, and whether they left the end.
export function useFeedScrollPosition(
  list: ListRef,
  input: PositionInput,
): FeedScrollPosition {
  const { entries, newestKey } = input;

  const opening = useOpensAtEnd(list, entries.length - 1, input);

  useRequestsOlderNearTop(list, keyOf(entries[0]), input.onStartReached);

  return positionAt(opening, useNewestKeyWhenLeftEnd(list, newestKey));
}
