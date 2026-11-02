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
import { SessionMemory } from '../../../../lib/session-memory';
import { type FeedEntry, entryKey } from './feed-entry';

type ListRef = RefObject<LegendListRef | null>;

// A frame after the page is first shown, once, scrolls to the very end. A page preloaded out of sight, as behind iOS's long-press preview, gains its header's inset only once shown.
type FeedAnchor = { key: string; offset: number };

const scrollMemory = new SessionMemory<FeedAnchor | null>(null);

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

function openAtAnchor(
  list: ListRef,
  anchor: FeedAnchor | null,
  opened: { current: boolean },
): void {
  opened.current = true;
  showAnchor(list, anchor);
}

function useScrollsToEndWhenShown(
  list: ListRef,
  enabled: boolean,
  anchor: FeedAnchor | null,
): void {
  const shown = useScreenFocused() && enabled;
  const opened = useRef(false);

  useEffect(() => {
    if (!shown || opened.current) return;

    const frame = requestAnimationFrame(() =>
      openAtAnchor(list, anchor, opened),
    );

    return (): void => cancelAnimationFrame(frame);
  }, [list, shown, anchor]);
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

  useScrollsToEndWhenShown(list, !input.opensAtStart, anchor);

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

function currentAnchor(current: LegendListRef): FeedAnchor | null | undefined {
  return current.getState().isAtEnd
    ? null
    : current.anchorVisibleContent({ hold: false });
}

const listAnchor = (list: ListRef): FeedAnchor | null | undefined =>
  list.current ? currentAnchor(list.current) : undefined;

export function rememberFeedPosition(
  sessionId: string | undefined,
  list: ListRef,
): void {
  if (!sessionId) return;
  const anchor = listAnchor(list);

  if (anchor !== undefined) scrollMemory.write(sessionId, anchor);
}
