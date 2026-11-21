import type { ConversationPartial } from '@repo/contracts';
import { useMemo, useState } from 'react';
import { feedItemKey, type FeedViewItem } from './feed-view';
import {
  appendPartialTranscripts,
  projectPartialTranscripts,
  type PartialTranscript,
} from './with-partial-transcripts';

const empty: readonly ConversationPartial[] = [];

interface Projection {
  sessionId: string;
  partials: readonly ConversationPartial[];
  rows: readonly PartialTranscript[];
}

function project(
  sessionId: string,
  partials: readonly ConversationPartial[],
  previous?: Projection,
): Projection {
  return {
    sessionId,
    partials,
    rows: projectPartialTranscripts(
      partials,
      sessionId,
      previous?.sessionId === sessionId ? previous.rows : [],
    ),
  };
}

// Keep the Feed's other rows, including any held partial, stable while one speaker's text changes.
export function usePartialTranscripts(
  stored: readonly FeedViewItem[],
  sessionId = '',
  partials: readonly ConversationPartial[] = empty,
): readonly FeedViewItem[] {
  const [held, setHeld] = useState(() => project(sessionId, partials));

  const current =
    held.sessionId === sessionId && held.partials === partials
      ? held
      : project(sessionId, partials, held);

  if (current !== held) setHeld(current);

  const hasPartials = current.rows.length > 0;

  const storedKeys = useMemo(
    () => (hasPartials ? new Set(stored.map(feedItemKey)) : undefined),
    [hasPartials, stored],
  );

  return useMemo(
    () =>
      appendPartialTranscripts(
        stored,
        current.rows.map(({ row }) => row),
        storedKeys,
      ),
    [stored, current.rows, storedKeys],
  );
}
