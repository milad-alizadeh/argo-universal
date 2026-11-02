import type { LegendListRef } from '@legendapp/list/react-native';
import { useNewestKeyWhenLeftEnd } from '@repo/kit/primitives/lists/list';
import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { type FeedEntry, entryKey } from './feed-entry';
import { type FeedAnchor, scrollMemory } from './feed-scroll-memory';
import { useSeekFeedAnchor } from './use-seek-feed-anchor';

type ListRef = RefObject<LegendListRef | null>;

// A frame after the page is first shown, once, scrolls to the very end. A page preloaded out of sight, as behind iOS's long-press preview, gains its header's inset only once shown.
function showAnchor(list: ListRef, anchor: FeedAnchor | null): void {
  const current = list.current;

  if (!current) return;

  if (anchor === null) void current.scrollToEnd({ animated: false });
  else
    void current.scrollToKey({
      key: anchor.key,
      viewPosition: 0,
      viewOffset: -anchor.offset,
      animated: false,
    });
}

const isSameAnchor = (list: ListRef, anchor: FeedAnchor): boolean =>
  list.current?.anchorVisibleContent({ hold: false })?.key === anchor.key;

function settleAnchor(list: ListRef, anchor: FeedAnchor | null): void {
  if (!anchor) return;

  if (isSameAnchor(list, anchor)) showAnchor(list, anchor);
}

const containsAnchor = (
  entries: FeedEntry[],
  anchor: FeedAnchor | null,
): boolean =>
  anchor === null || entries.some((entry) => entryKey(entry) === anchor.key);

const seekActions = (
  list: ListRef,
  anchor: FeedAnchor | null,
  input: PositionInput,
): Pick<
  Parameters<typeof useSeekFeedAnchor>[0],
  'requestOlder' | 'open' | 'settle'
> => ({
  requestOlder: input.onStartReached,
  open: (present: boolean): void => showAnchor(list, present ? anchor : null),
  settle: (): void => settleAnchor(list, anchor),
});

function seekInput(
  list: ListRef,
  anchor: FeedAnchor | null,
  input: PositionInput & { shown: boolean },
): Parameters<typeof useSeekFeedAnchor>[0] {
  return {
    ...seekActions(list, anchor, input),
    shown: input.shown,
    found: containsAnchor(input.entries, anchor),
    oldest: keyOf(input.entries[0]),
    hasOlder: input.hasOlder,
    loadingOlder: input.loadingOlder,
  };
}

function useScrollsToEndWhenShown(
  list: ListRef,
  anchor: FeedAnchor | null,
  input: PositionInput,
): void {
  const shown = useScreenFocused() && !input.opensAtStart;

  useSeekFeedAnchor(seekInput(list, anchor, { ...input, shown }));
}

function useOpensAtEnd(
  list: ListRef,
  lastIndex: number,
  input: PositionInput,
): number {
  const [initialIndex] = useState(input.opensAtStart ? 0 : lastIndex);

  const [anchor] = useState(() =>
    input.sessionId ? scrollMemory.read(input.sessionId) : null,
  );

  useScrollsToEndWhenShown(list, anchor, input);

  return initialIndex;
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
}

const positionAt = (
  initialIndex: number,
  newestKeyWhenLeftEnd: string | null,
): FeedScrollPosition => ({
  initialIndex,
  newestKeyWhenLeftEnd,
  atEnd: newestKeyWhenLeftEnd === null,
});

interface PositionInput {
  entries: FeedEntry[];
  newestKey: string;
  onStartReached: () => void;
  loadingOlder: boolean;
  hasOlder?: boolean;
  opensAtStart?: boolean;
  sessionId?: string;
}

// Where the reader is in the Feed: where it opened, and whether they left the end.
export function useFeedScrollPosition(
  list: ListRef,
  input: PositionInput,
): FeedScrollPosition {
  const { entries, newestKey } = input;

  const initialIndex = useOpensAtEnd(list, entries.length - 1, input);

  useRequestsOlderNearTop(list, keyOf(entries[0]), input.onStartReached);

  return positionAt(initialIndex, useNewestKeyWhenLeftEnd(list, newestKey));
}
