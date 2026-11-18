import { useMemo, useState } from 'react';
import {
  type FeedEntry,
  type LiveHeaderEntry,
  entryKey,
  liveHeaderEntry,
} from './feed-entry';

interface HeaderSpace {
  sessionId?: string;
  after: string;
  entry: LiveHeaderEntry;
}

function spaceAfter(
  entries: FeedEntry[],
  sessionId?: string,
): HeaderSpace | undefined {
  const active = liveHeaderEntry(entries.at(-1));
  const previous = entries.at(-2);

  if (!active || !previous) return;

  return {
    sessionId,
    after: entryKey(previous),
    entry: { ...active, closing: true },
  };
}

function sameTail(
  space: HeaderSpace,
  last: FeedEntry | undefined,
  sessionId?: string,
): boolean {
  return (
    space.sessionId === sessionId &&
    last !== undefined &&
    space.after === entryKey(last)
  );
}

function spaceAtRest(
  held: HeaderSpace | undefined,
  last?: FeedEntry,
  sessionId?: string,
): HeaderSpace | undefined {
  return held && sameTail(held, last, sessionId) ? held : undefined;
}

function useHeaderSpace(
  entries: FeedEntry[],
  sessionId: string | undefined,
  running: boolean,
): HeaderSpace | undefined {
  const active = useMemo(
    () => spaceAfter(entries, sessionId),
    [entries, sessionId],
  );

  const [held, setHeld] = useState(active);

  const next = running ? active : spaceAtRest(held, entries.at(-1), sessionId);

  if (next !== held) setHeld(next);

  return next;
}

/*
 * A successful Turn leaves the answer at its reading position. A new row, including a Turn end,
 * takes the space immediately. A Session opened after completion needs no space reserved.
 */
export function useExitingLiveHeader(
  entries: FeedEntry[],
  sessionId: string | undefined,
  running: boolean,
): FeedEntry[] {
  const held = useHeaderSpace(entries, sessionId, running);
  const space = running ? undefined : held;

  return useMemo(
    () => (space ? [...entries, space.entry] : entries),
    [entries, space],
  );
}
