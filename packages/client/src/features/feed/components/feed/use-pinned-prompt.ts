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

interface Landing {
  room: Room;
  index: number;
  clearance: number;
  animated: boolean;
}

const riseTo = (
  list: FeedList,
  { index, clearance, animated }: Landing,
): void =>
  void list.current?.scrollToIndex({
    index,
    viewPosition: 0,
    viewOffset: clearance,
    animated,
  });

// A prompt just sent scrolls to itself, at the top of the view clear of the header's fade; one already running lands at the end.
const land = (list: FeedList, landing: Landing): void =>
  landing.room === 'moves'
    ? riseTo(list, landing)
    : void list.current?.scrollToEnd({ animated: false });

/*
 * Scrolls each prompt into place once, the first time its answer's rows have measured. A prompt just sent
 * scrolls to itself rather than to the end: measured, an animated scroll to the end let the answer growing
 * meanwhile push the prompt up out of the view, so the Feed rested clipped or following the end. A turn
 * already running when the Feed opened lands without motion at the end, as it always did.
 */
function useScrollIntoPlace(
  list: FeedList,
  clearance: number,
  room: Room,
): OnReady {
  const pinned = useRef('');
  const reduced = useReducedMotionNow();

  return ({ anchorKey, anchorIndex }) => {
    if (anchorIndex === undefined || !isNewKey(anchorKey, pinned.current))
      return;
    pinned.current = anchorKey;
    land(list, { room, index: anchorIndex, clearance, animated: !reduced });
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
  const onReady = useScrollIntoPlace(list, anchorOffset, room);

  if (room === 'none') return undefined;

  return { anchorIndex, anchorOffset, onReady };
}
