import type { LegendListRef } from '@legendapp/list/react-native';
import type { ListProps } from '@repo/kit/primitives/lists/list';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { type RefObject, useRef, useState } from 'react';
import { useFeedTopClearance } from '#lib/product/feed-fade';
import { type FeedRowData, rowKey } from './feed-row-data';

type PinnedPrompt = ListProps<FeedRowData>['anchoredEndSpace'];

// The newest prompt when the Feed opened, and whether its turn was still running.
interface OpenedOn {
  key: string | undefined;
  live: boolean;
}

const isPrompt = ({ entry }: FeedRowData): boolean =>
  entry.type === 'row' && entry.row.sessionUpdate === 'user_message';

const isLive = ({ entry }: FeedRowData): boolean =>
  entry.type === 'live_header';

function openedOn(rows: readonly FeedRowData[]): OpenedOn {
  const prompt = rows.findLast(isPrompt);

  return { key: prompt && rowKey(prompt), live: rows.some(isLive) };
}

/*
 * A prompt sent while the Feed is open rests at the top of the view, with room kept below it for the
 * answer, so the answer writes downward into that room and the Feed never scrolls while it streams.
 * It scrolls up into place once its answer's rows have measured. A turn still running when the Feed
 * opens lands in place without motion; a settled one keeps no room, so the Feed ends above the Composer.
 */
export function usePinnedPrompt(
  list: RefObject<LegendListRef | null>,
  rows: readonly FeedRowData[],
): PinnedPrompt {
  const anchorIndex = rows.findLastIndex(isPrompt);
  const anchorOffset = useFeedTopClearance();
  const reduced = useReducedMotionNow();
  const [opened, setOpened] = useState<OpenedOn | undefined>(undefined);
  // The prompt last scrolled into place.
  const pinned = useRef<string | undefined>(undefined);

  if (!opened && rows.length) setOpened(openedOn(rows));
  const prompt = rows[anchorIndex];

  if (!opened || !prompt) return undefined;
  const openedOnIt = rowKey(prompt) === opened.key;

  if (openedOnIt && !opened.live) return undefined;

  return {
    anchorIndex,
    anchorOffset,
    onReady: ({ anchorKey }) => {
      if (anchorKey === undefined || anchorKey === pinned.current) return;
      pinned.current = anchorKey;
      void list.current?.scrollToEnd({ animated: !openedOnIt && !reduced });
    },
  };
}
