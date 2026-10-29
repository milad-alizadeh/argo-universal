import { useState } from 'react';
import {
  type FeedEntry,
  entryKey,
  entryType,
  spaceBelowEntry,
} from './feed-entry';

export interface FeedRowData {
  entry: FeedEntry;
  spaceBelow: string;
}

interface HeldRows {
  entries: FeedEntry[];
  rows: FeedRowData[];
}

export const rowKey = (row: FeedRowData): string => entryKey(row.entry);

export const rowType = (row: FeedRowData): ReturnType<typeof entryType> =>
  entryType(row.entry);

function spacedRow(
  entry: FeedEntry,
  next: FeedEntry | undefined,
  held: FeedRowData | undefined,
): FeedRowData {
  const spaceBelow = spaceBelowEntry(entry, next);

  return held?.spaceBelow === spaceBelow ? held : { entry, spaceBelow };
}

function rowData(entries: FeedEntry[], previous?: HeldRows): HeldRows {
  const held = new Map(previous?.rows.map((row) => [row.entry, row]));

  return {
    entries,
    rows: entries.map((entry, index) =>
      spacedRow(entry, entries[index + 1], held.get(entry)),
    ),
  };
}

/*
 * Legend List caches a cell by its data, not renderItem's closure. A changed gap must change
 * that data. Keep other rows and their expansion state, without redrawing every row per chunk.
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
