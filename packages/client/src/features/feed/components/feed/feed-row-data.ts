import { useState } from 'react';
import {
  type FeedEntry,
  entryKey,
  entryType,
  isStreamingEntry,
  spaceBelowEntry,
} from './feed-entry';

export interface FeedRowData {
  entry: FeedEntry;
  spaceBelow: string;
  streaming: boolean;
}

interface HeldRows {
  entries: FeedEntry[];
  rows: FeedRowData[];
}

export const rowKey = (row: FeedRowData): string => entryKey(row.entry);

export const rowType = (row: FeedRowData): ReturnType<typeof entryType> =>
  entryType(row.entry);

const samePlace = (first: FeedRowData, second: FeedRowData): boolean =>
  first.spaceBelow === second.spaceBelow &&
  first.streaming === second.streaming;

function placedRow(
  entry: FeedEntry,
  next: FeedEntry | undefined,
  held: FeedRowData | undefined,
): FeedRowData {
  const placed = {
    entry,
    spaceBelow: spaceBelowEntry(entry, next),
    streaming: isStreamingEntry(entry, next),
  };

  return held && samePlace(held, placed) ? held : placed;
}

function rowData(entries: FeedEntry[], previous?: HeldRows): HeldRows {
  const held = new Map(previous?.rows.map((row) => [row.entry, row]));

  return {
    entries,
    rows: entries.map((entry, index) =>
      placedRow(entry, entries[index + 1], held.get(entry)),
    ),
  };
}

/*
 * Legend List caches a cell by its data, not renderItem's closure. A changed gap or caret must
 * change that data. Keep other rows and their expansion state, without redrawing every row per chunk.
 */
export function useFeedRowData(entries: FeedEntry[]): FeedRowData[] {
  const [held, setHeld] = useState(() => rowData(entries));

  if (held.entries !== entries) {
    const next = rowData(entries, held);
    setHeld(next);

    return next.rows;
  }

  return held.rows;
}
