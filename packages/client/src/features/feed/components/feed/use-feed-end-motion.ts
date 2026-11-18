import { useReducedMotion } from 'react-native-reanimated';
import type { FeedRowData } from './feed-row-data';

// A settled Feed follows viewport and Composer measurements to the end (#1811).
const followEnd = {
  on: { layout: true, footerLayout: true, dataChange: true, itemLayout: true },
};

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
