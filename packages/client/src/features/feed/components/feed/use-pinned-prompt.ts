import type { LegendListRef } from '@legendapp/list/react-native';
import type { ListProps } from '@repo/kit/primitives/lists/list';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { type RefObject, useRef, useState } from 'react';
import { useFeedTopClearance } from '#lib/product/feed-fade';
import { type FeedRowData, rowKey } from './feed-row-data';

type PinnedPrompt = ListProps<FeedRowData>['anchoredEndSpace'];

type OnReady = NonNullable<PinnedPrompt>['onReady'];

type FeedList = RefObject<LegendListRef | null>;

// Whether a prompt keeps room below it, and whether it moves into place or is there already.
type Room = 'none' | 'lands' | 'moves';

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

// A prompt sent since the Feed opened moves into place; the one it opened on lands there while its turn runs, and keeps no room once settled.
function roomOf(key: string, opened: OpenedOn): Room {
  if (key !== opened.key) return 'moves';

  return opened.live ? 'lands' : 'none';
}

const roomFor = (prompt: FeedRowData | undefined, opened?: OpenedOn): Room =>
  prompt && opened ? roomOf(rowKey(prompt), opened) : 'none';

// What the Feed opened on, read once from its first rows.
function useOpenedOn(rows: readonly FeedRowData[]): OpenedOn | undefined {
  const [opened, setOpened] = useState<OpenedOn>();

  if (!opened && rows.length) setOpened(openedOn(rows));

  return opened;
}

const isNewKey = (key: string | undefined, last: string): key is string =>
  key !== undefined && key !== last;

// Scrolls each prompt into place once, the first time its answer's rows have measured.
function useScrollIntoPlace(list: FeedList, animated: boolean): OnReady {
  const pinned = useRef('');

  return ({ anchorKey }) => {
    if (!isNewKey(anchorKey, pinned.current)) return;
    pinned.current = anchorKey;
    void list.current?.scrollToEnd({ animated });
  };
}

/*
 * A prompt sent while the Feed is open rests at the top of the view, with room kept below it for the
 * answer, so the answer writes downward into that room and the Feed never scrolls while it streams.
 * It scrolls up into place once its answer's rows have measured. A turn still running when the Feed
 * opens lands in place without motion; a settled one keeps no room, so the Feed ends above the Composer.
 */
export function usePinnedPrompt(
  list: FeedList,
  rows: readonly FeedRowData[],
): PinnedPrompt {
  const anchorIndex = rows.findLastIndex(isPrompt);
  const anchorOffset = useFeedTopClearance();
  const room = roomFor(rows[anchorIndex], useOpenedOn(rows));
  const reduced = useReducedMotionNow();
  const onReady = useScrollIntoPlace(list, room === 'moves' && !reduced);

  if (room === 'none') return undefined;

  return { anchorIndex, anchorOffset, onReady };
}
