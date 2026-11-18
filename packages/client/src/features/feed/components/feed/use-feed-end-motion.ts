import { useReducedMotion } from 'react-native-reanimated';
import { liveHeaderEntry } from './feed-entry';
import type { FeedRowData } from './feed-row-data';

// A settled Feed follows viewport and Composer measurements to the end (#1811).
const followEnd = {
  on: { layout: true, footerLayout: true, dataChange: true, itemLayout: true },
};

// Incoming rows and new lines of prose move the reader to the new end over several frames.
const glideToEnd = { ...followEnd, animated: true };

const isClosing = (row?: FeedRowData): boolean =>
  Boolean(liveHeaderEntry(row?.entry)?.onExit);

const isTurnEnd = (row?: FeedRowData): boolean =>
  row?.entry.type === 'turn_end';

// Ease toward an incoming Turn end while Working closes, as with other new rows.
const addsTurnEnd = (items: FeedRowData[]): boolean =>
  isClosing(items.at(-1)) && isTurnEnd(items.at(-2));

function followsNewRows(items: FeedRowData[], turnRunning: boolean): boolean {
  return (
    turnRunning ||
    addsTurnEnd(items) ||
    items.slice(-2).some((row) => row.streaming)
  );
}

export type FeedEndMotion = typeof followEnd;

export function useFeedEndMotion(
  items: FeedRowData[],
  turnRunning: boolean,
): FeedEndMotion {
  const reduced = useReducedMotion();

  return followsNewRows(items, turnRunning) && !reduced
    ? glideToEnd
    : followEnd;
}
