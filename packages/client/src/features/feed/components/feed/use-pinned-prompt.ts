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

// The newest prompt when the Feed opened, whether its turn was still running, and every row it opened on.
interface OpenedOn {
  key: string | undefined;
  live: boolean;
  keys: ReadonlySet<string>;
}

// Where the newest prompt sits among the rows now, against what the Feed opened on.
interface PromptPlace {
  rows: readonly FeedRowData[];
  index: number;
  opened: OpenedOn;
}

const isPrompt = ({ entry }: FeedRowData): boolean =>
  entry.type === 'row' && entry.row.sessionUpdate === 'user_message';

const isLive = ({ entry }: FeedRowData): boolean =>
  entry.type === 'live_header';

function openedOn(rows: readonly FeedRowData[]): OpenedOn {
  const prompt = rows.findLast(isPrompt);

  return {
    key: prompt && rowKey(prompt),
    live: rows.some(isLive),
    keys: new Set(rows.map(rowKey)),
  };
}

/*
 * A prompt with a row the Feed opened on below it paged in from older history, however new it is to the
 * list. A Turn longer than a page keeps its prompt back there, and the reader reading back to it never
 * sent it here. A prompt they did send stands below every row the Feed opened on.
 */
const fromHistory = ({ rows, index, opened }: PromptPlace): boolean =>
  rows.some((row, at) => at > index && opened.keys.has(rowKey(row)));

// The prompt the Feed opened on lands in place while its turn runs, and keeps no room once settled.
const roomAtOpen = (opened: OpenedOn): Room => (opened.live ? 'lands' : 'none');

// A prompt sent since the Feed opened moves into place; one that paged in from history keeps no room.
function roomSince(place: PromptPlace): Room {
  return fromHistory(place) ? 'none' : 'moves';
}

function roomOf(key: string, place: PromptPlace): Room {
  return key === place.opened.key ? roomAtOpen(place.opened) : roomSince(place);
}

function roomFor(
  rows: readonly FeedRowData[],
  index: number,
  opened?: OpenedOn,
): Room {
  const prompt = rows[index];

  if (!prompt || !opened) return 'none';

  return roomOf(rowKey(prompt), { rows, index, opened });
}

// What the Feed opened on, read once from its first rows.
function useOpenedOn(rows: readonly FeedRowData[]): OpenedOn | undefined {
  const [opened, setOpened] = useState<OpenedOn>();

  if (!opened && rows.length) setOpened(openedOn(rows));

  return opened;
}

const isNewKey = (key: string | undefined, last: string): key is string =>
  key !== undefined && key !== last;

// The prompt at the top of the view, clear of the header's fade.
function scrollToPrompt(
  list: FeedList,
  index: number,
  { clearance, animated }: { clearance: number; animated: boolean },
): void {
  void list.current?.scrollToIndex({
    index,
    viewPosition: 0,
    viewOffset: clearance,
    animated,
  });
}

/*
 * Scrolls each prompt into place once, the first time its answer's rows have measured. It scrolls to the
 * prompt itself, not to the end: while a scroll to the end is under way the list holds the end still, so
 * an answer that grows meanwhile pushes the prompt up out of the view, and the Feed rests clipped or
 * following the end instead of pinned.
 */
function useScrollIntoPlace(
  list: FeedList,
  clearance: number,
  moves: boolean,
): OnReady {
  const pinned = useRef('');
  const reduced = useReducedMotionNow();
  const animated = moves && !reduced;

  return ({ anchorKey, anchorIndex }) => {
    if (!isNewKey(anchorKey, pinned.current)) return;
    pinned.current = anchorKey;
    scrollToPrompt(list, anchorIndex, { clearance, animated });
  };
}

/*
 * A prompt sent while the Feed is open rests at the top of the view, with room kept below it for the
 * answer, so the answer writes downward into that room and the Feed never scrolls while it streams.
 * It scrolls up into place once its answer's rows have measured. A turn still running when the Feed
 * opens lands in place without motion; a settled one keeps no room, so the Feed ends above the Composer.
 * A prompt that pages in above, from a Turn longer than a page, is history and pins nothing.
 */
export function usePinnedPrompt(
  list: FeedList,
  rows: readonly FeedRowData[],
): PinnedPrompt {
  const anchorIndex = rows.findLastIndex(isPrompt);
  const anchorOffset = useFeedTopClearance();
  const room = roomFor(rows, anchorIndex, useOpenedOn(rows));
  const onReady = useScrollIntoPlace(list, anchorOffset, room === 'moves');

  if (room === 'none') return undefined;

  return { anchorIndex, anchorOffset, onReady };
}
