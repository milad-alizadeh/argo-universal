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

type ListRef = RefObject<LegendListRef | null>;

// Opens on the newest row by estimated sizes, then a frame after the page is first shown at the very end; from there `followEnd` keeps it there as rows measure. A page preloaded out of sight, as behind iOS's long-press preview, gains its header's inset only once shown.
function useOpensAtEnd(list: ListRef, lastIndex: number): number {
  const [initialIndex] = useState(lastIndex);
  const shown = useScreenFocused();
  const opened = useRef(false);
  useEffect(() => {
    if (!shown || opened.current) return;

    const frame = requestAnimationFrame(() => {
      opened.current = true;
      void list.current?.scrollToEnd({ animated: false });
    });

    return (): void => cancelAnimationFrame(frame);
  }, [list, shown]);

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

// Where the reader is in the Feed: where it opened, and whether they left the end.
export function useFeedScrollPosition(
  list: ListRef,
  {
    entries,
    newestKey,
    onStartReached,
  }: { entries: FeedEntry[]; newestKey: string; onStartReached: () => void },
): FeedScrollPosition {
  const initialIndex = useOpensAtEnd(list, entries.length - 1);
  useRequestsOlderNearTop(list, keyOf(entries[0]), onStartReached);

  return positionAt(initialIndex, useNewestKeyWhenLeftEnd(list, newestKey));
}
