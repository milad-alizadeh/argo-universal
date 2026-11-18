import { useReducedMotion } from 'react-native-reanimated';
import {
  type FeedEndMotion,
  type FeedTail,
  followEnd,
} from './feed-end-motion';
import type { FeedRowData } from './feed-row-data';
import type { ListRef } from './keep-place';

// Incoming rows and new lines of prose move the reader to the new end over several frames.
const glideToEnd = { ...followEnd, animated: true };

const isTurnEnd = (row?: FeedRowData): boolean =>
  row?.entry.type === 'turn_end';

function followsNewRows(items: FeedRowData[], turnRunning: boolean): boolean {
  return (
    turnRunning ||
    isTurnEnd(items.at(-1)) ||
    items.slice(-2).some((row) => row.streaming)
  );
}

export function useFeedEndMotion(
  _list: ListRef,
  { items, turnRunning }: FeedTail,
  _enabled: boolean,
): FeedEndMotion {
  const reduced = useReducedMotion();

  return followsNewRows(items, turnRunning) && !reduced
    ? glideToEnd
    : followEnd;
}
