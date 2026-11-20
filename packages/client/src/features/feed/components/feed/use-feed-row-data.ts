import { useState } from 'react';
import { Platform } from 'react-native';
import {
  type FeedEntry,
  isStreamingEntry,
  spaceBelowEntry,
} from './feed-entry';
import type { FeedRowData } from './feed-row-data';

interface HeldRows {
  entries: FeedEntry[];
  rows: FeedRowData[];
}

const samePlace = (first: FeedRowData, second: FeedRowData): boolean =>
  first.spaceBelow === second.spaceBelow &&
  first.spaceBefore === second.spaceBefore &&
  first.streaming === second.streaming;

const reuseRow = (placed: FeedRowData, held?: FeedRowData): FeedRowData =>
  held && samePlace(held, placed) ? held : placed;

// Keep the leading gap with the Working line, including when Android replaces it with a Tool group.
const leadingSpaceTypes =
  Platform.OS === 'android' ? ['live_header', 'group'] : ['live_header'];

const carriesLeadingSpace = (entry?: FeedEntry): boolean =>
  !!entry && leadingSpaceTypes.includes(entry.type);

const spaceBelow = (entry: FeedEntry, next?: FeedEntry): string =>
  carriesLeadingSpace(next) ? '' : spaceBelowEntry(entry, next);

const spaceBefore = (
  entry: FeedEntry,
  previous?: FeedEntry,
): string | undefined =>
  carriesLeadingSpace(entry) && previous
    ? spaceBelowEntry(previous, entry)
    : undefined;

function placedRow(
  entry: FeedEntry,
  previous: FeedEntry | undefined,
  next: FeedEntry | undefined,
): FeedRowData {
  return {
    entry,
    spaceBelow: spaceBelow(entry, next),
    spaceBefore: spaceBefore(entry, previous),
    streaming: isStreamingEntry(entry, next),
  };
}

function rowData(entries: FeedEntry[], previous?: HeldRows): HeldRows {
  const held = new Map(previous?.rows.map((row) => [row.entry, row]));

  return {
    entries,
    rows: entries.map((entry, index) =>
      reuseRow(
        placedRow(entry, entries[index - 1], entries[index + 1]),
        held.get(entry),
      ),
    ),
  };
}

/*
 * Legend List caches a cell by its data, not renderItem's closure. A changed gap or streaming state must
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
