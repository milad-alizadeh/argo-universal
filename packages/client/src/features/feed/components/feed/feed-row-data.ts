import type { ContentBlock } from '@repo/contracts';
import { useState } from 'react';
import {
  type FeedEntry,
  entryKey,
  entryType,
  isStreamingEntry,
  liveHeaderEntry,
  spaceBelowEntry,
} from './feed-entry';

export interface FeedRowData {
  entry: FeedEntry;
  spaceBelow: string;
  spaceBefore?: string;
  streaming: boolean;
}

const emptyTextBlock = (block: ContentBlock): boolean =>
  block.type === 'text' && block.text === '';

const emptyContent = (content: readonly ContentBlock[]): boolean =>
  content.length <= 1 && content.every(emptyTextBlock);

function emptyAnswer(entry: FeedEntry): boolean {
  if (entry.type !== 'row') return false;

  return (
    entry.row.sessionUpdate === 'agent_message' &&
    emptyContent(entry.row.content)
  );
}

// A streaming answer has no trailing gap. Its opening event can arrive before the first token.
export function emptyMessageSize(row: FeedRowData): number | undefined {
  return row.streaming && emptyAnswer(row.entry) ? 0 : undefined;
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
  first.spaceBefore === second.spaceBefore &&
  first.streaming === second.streaming;

const reuseRow = (placed: FeedRowData, held?: FeedRowData): FeedRowData =>
  held && samePlace(held, placed) ? held : placed;

// The standalone live header closes with its gap, so no other row loses height when it leaves.
const spaceBelow = (entry: FeedEntry, next?: FeedEntry): string =>
  liveHeaderEntry(next) ? '' : spaceBelowEntry(entry, next);

const spaceBefore = (
  entry: FeedEntry,
  previous?: FeedEntry,
): string | undefined =>
  liveHeaderEntry(entry) && previous
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
