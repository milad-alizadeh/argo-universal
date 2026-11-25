import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  type FeedEntry,
  isStreamingEntry,
  spaceBelowEntry,
} from './feed-entry';
import type { FeedRowData } from './feed-row-data';

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

// The rows the last draw held, found where the entry stood or, after rows paged in above it, by the entry itself.
function rowData(
  entries: FeedEntry[],
  previous: readonly FeedRowData[],
): FeedRowData[] {
  let byEntry: Map<FeedEntry, FeedRowData> | undefined;

  const heldFor = (
    entry: FeedEntry,
    index: number,
  ): FeedRowData | undefined => {
    const standing = previous[index];

    if (standing?.entry === entry) return standing;
    byEntry ??= new Map(previous.map((row) => [row.entry, row]));

    return byEntry.get(entry);
  };

  return entries.map((entry, index) =>
    reuseRow(
      placedRow(entry, entries[index - 1], entries[index + 1]),
      heldFor(entry, index),
    ),
  );
}

/*
 * Legend List caches a cell by its data, not renderItem's closure. A changed gap or streaming state must
 * change that data. Keep other rows and their expansion state, without redrawing every row per chunk.
 */
export function useFeedRowData(entries: FeedEntry[]): FeedRowData[] {
  const drawn = useRef<FeedRowData[]>([]);

  // eslint-disable-next-line react/refs -- the last draw is what the rows are kept from
  const rows = useMemo(() => rowData(entries, drawn.current), [entries]);

  useEffect(() => {
    drawn.current = rows;
  }, [rows]);

  return rows;
}
