import type {
  LegendListRef,
  LegendListState,
} from '@legendapp/list/react-native';
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
import { useResumeFollowing } from './use-resume-following';
import { useSeekFeedAnchor } from './use-seek-feed-anchor';

// What the Feed's position reads and drives; the list it mounts is a Legend List.
export type PositionList = Pick<
  LegendListRef,
  'scrollToEnd' | 'scrollToKey' | 'cancelScroll' | 'anchorVisibleContent'
> & {
  getState: () => Pick<
    LegendListState,
    'isNearStart' | 'isAtEnd' | 'isFollowingEnd' | 'listen'
  >;
};

type ListRef = RefObject<PositionList | null>;

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
  input: PositionInput & {
    shown: boolean;
    settled: boolean;
    onCancel: () => void;
  },
  anchor: FeedAnchor | null,
  open: (anchor: FeedAnchor | null) => void,
): Parameters<typeof useSeekFeedAnchor>[0] {
  return {
    // Older rows are asked for only once the list has settled where it opened.
    shown: input.shown && input.settled,
    found: containsAnchor(input.entries, anchor),
    ...seekWindow(input),
    requestOlder: input.onStartReached,
    open: (present): void => {
      if (present && anchor) open(anchor);
    },
    onCancel: input.onCancel,
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
  input: PositionInput & { settled: boolean; onCancel: () => void },
): () => void {
  const shown = useScreenFocused() && !input.opensAtStart;
  const restoration = useRestoreFeedAnchor(list, shown);
  const { cancel: cancelRestoration } = restoration;

  const cancelSeek = useSeekFeedAnchor(
    seekInput({ ...input, shown }, anchor, restoration.open),
  );

  useResumeFollowing(list, shown, restoration.open);

  return useCancelRestoration(cancelSeek, cancelRestoration);
}

interface Opening {
  initialIndex: number;
  cancelRestore: () => void;
  // The remembered row is still above the rows loaded, so the seek owns asking for older ones.
  seeking: boolean;
}

function useOpensAtEnd(
  list: ListRef,
  input: PositionInput & { settled: boolean },
): Opening {
  const [anchor] = useState(() =>
    input.sessionId ? scrollMemory.read(input.sessionId) : null,
  );

  const [initialIndex] = useState(
    input.opensAtStart ? 0 : input.entries.length - 1,
  );

  // Once the reader takes over, the seek has let go and the remembered row is no longer sought.
  const [tookOver, setTookOver] = useState(false);

  // Any input cancels the seek, but with no remembered row there is nothing to stop, so the Feed does not render for it.
  const onCancel = useCallback(() => {
    if (anchor) setTookOver(true);
  }, [anchor]);

  const cancelRestore = useScrollsToEndWhenShown(list, anchor, {
    ...input,
    onCancel,
  });

  const seeking =
    !input.opensAtStart &&
    !tookOver &&
    anchor !== null &&
    !containsAnchor(input.entries, anchor);

  return { initialIndex, cancelRestore, seeking };
}

const keyOf = (entry: FeedEntry | undefined): string | undefined =>
  entry && entryKey(entry);

// The list asks for older rows once until the reader scrolls well away, so a reader still near the top asks again as each page lands.
function useRequestsOlderNearTop(
  list: ListRef,
  oldestKey: string | undefined,
  {
    settled,
    seeking,
    onStartReached,
  }: { settled: boolean; seeking: boolean; onStartReached: () => void },
): void {
  const requestOlderIfNearTop = useEffectEvent(() => {
    if (list.current?.getState().isNearStart) onStartReached();
  });

  // Null before the first ask; the Feed always has an oldest row.
  const askedAtOldestKey = useRef<string | null | undefined>(null);
  useEffect(() => {
    // Nothing is asked for before the list has settled; settling asks once for the rows it opened on.
    if (!settled || seeking || askedAtOldestKey.current === oldestKey) return;
    askedAtOldestKey.current = oldestKey;
    requestOlderIfNearTop();
  }, [oldestKey, settled, seeking]);
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
  // The list has placed its opening rows; older history may now be asked for.
  settled: boolean;
  onReady: () => void;
  newestKeyWhenLeftEnd: string | null;
  atEnd: boolean;
  cancelRestore: () => void;
}

const positionAt = (
  opening: Omit<Opening, 'seeking'>,
  settling: Pick<FeedScrollPosition, 'settled' | 'onReady'>,
  newestKeyWhenLeftEnd: string | null,
): FeedScrollPosition => ({
  ...opening,
  ...settling,
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
  const [settled, setSettled] = useState(false);
  const onReady = useCallback(() => setSettled(true), []);

  const opening = useOpensAtEnd(list, { ...input, settled });

  const { seeking, ...opened } = opening;

  useRequestsOlderNearTop(list, keyOf(entries[0]), {
    settled,
    seeking,
    onStartReached: input.onStartReached,
  });

  return positionAt(
    opened,
    { settled, onReady },
    useNewestKeyWhenLeftEnd(list, newestKey),
  );
}
