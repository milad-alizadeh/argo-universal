import type { LegendListRef } from '@legendapp/list/react-native';
import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { type FeedEntry, entryKey } from './feed-entry';

type ListRef = RefObject<LegendListRef | null>;

// Opens on the newest row by estimated sizes, then a frame later at the very end; from there `followEnd` keeps it there as rows measure.
function useOpensAtEnd(list: ListRef, lastIndex: number): number {
  const [initialIndex] = useState(lastIndex);
  useEffect(() => {
    const frame = requestAnimationFrame(
      () => void list.current?.scrollToEnd({ animated: false }),
    );

    return (): void => cancelAnimationFrame(frame);
  }, [list]);

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

const listenAtEnd = (
  list: ListRef,
  onAtEndChange: (atEnd: boolean) => void,
): (() => void) | undefined =>
  list.current
    ?.getState()
    .listen('isWithinMaintainScrollAtEndThreshold', onAtEndChange);

// Null while the reader is at the end.
function useNewestKeyWhenLeftEnd(
  list: ListRef,
  newestKey: string,
): string | null {
  const [leftEndAt, setLeftEndAt] = useState<string | null>(null);

  const onAtEndChange = useEffectEvent((atEnd: boolean) =>
    setLeftEndAt(atEnd ? null : newestKey),
  );

  useEffect(() => listenAtEnd(list, onAtEndChange), [list]);

  return leftEndAt;
}

export interface FeedScrollPosition {
  initialIndex: number;
  newestKeyWhenLeftEnd: string | null;
}

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
  const newestKeyWhenLeftEnd = useNewestKeyWhenLeftEnd(list, newestKey);

  return { initialIndex, newestKeyWhenLeftEnd };
}
