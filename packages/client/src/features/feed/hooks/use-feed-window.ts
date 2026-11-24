import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import {
  skipToken,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useTRPCClient } from '#features/connection';
import {
  FeedCache,
  type FeedCachePorts,
  feedQueryDefaults,
} from '../api/feed-cache';
import { emptyFeed, type FeedState } from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { shownRows } from '../view/held-plan';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import { waitForFrame } from './frame-wait';

// Translates Feed rows to the Feed view, such as the Session's own or a subagent's.
export type FeedViewTranslator = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
) => FeedView;

interface FeedWindowOptions {
  // The key of the Feed the App keeps; the Session's id unless a screen shows another Feed of it.
  cacheId: string | undefined;
  shown: boolean;
  // The Session's own tail pages itself; a window fed by other pages, such as a subagent's reports, does not.
  tail: boolean;
}

export interface FeedWindow {
  cache: FeedCache;
  feed: FeedState;
  snapshot: SessionSnapshot | null;
  view: FeedView | null;
  // The query that holds the window.
  query: UseQueryResult<FeedState>;
}

// The Session's Feed from the query cache, drawn as a view. It commits only while the screen is shown (a hidden retained page holds its rows and writes nothing).
export function useFeedWindow(
  sessionId: string | undefined,
  translate: FeedViewTranslator,
  { cacheId, shown, tail }: FeedWindowOptions,
): FeedWindow {
  const cache = useFeedCache(sessionId, cacheId);
  useEffect(() => (shown ? cache.start() : undefined), [cache, shown]);

  const query = useQuery<FeedState>({
    ...feedQueryDefaults,
    queryKey: cache.key,
    queryFn: tail ? cache.loadTail : skipToken,
    enabled: sessionId !== undefined,
  });

  const { data: snapshot = null } = useQuery<SessionSnapshot | null>({
    ...feedQueryDefaults,
    queryKey: cache.snapshotKey,
    queryFn: skipToken,
  });

  const feed = query.data ?? emptyFeed;
  const view = useFeedViewOf(feed, snapshot, translate);

  return { cache, feed, snapshot, view, query };
}

// One cache per Session, over the App's query cache.
function useFeedCache(
  sessionId: string | undefined,
  cacheId: string | undefined,
): FeedCache {
  const queryClient = useQueryClient();
  const client = useTRPCClient();

  return useMemo(
    () => new FeedCache(queryClient, cacheId ?? '', portsOf(client, sessionId)),
    [queryClient, client, cacheId, sessionId],
  );
}

function portsOf(
  client: ReturnType<typeof useTRPCClient>,
  sessionId: string | undefined,
): FeedCachePorts {
  const id = sessionId ?? '';

  return {
    frame: waitForFrame,
    fetchPage: (cursor) =>
      client.feed.page.query({ sessionId: id, limit: pageSize, ...cursor }),
    fetchRow: (rowId) => client.feed.row.query({ sessionId: id, id: rowId }),
  };
}

const pageSize = 150;

// The view is translated again only when its rows or snapshot changed, and keeps the items that did not change.
function useFeedViewOf(
  feed: FeedState,
  snapshot: SessionSnapshot | null,
  translate: FeedViewTranslator,
): FeedView | null {
  const previous = useRef<FeedView | null>(null);
  // The view follows the rows, the Plan and the snapshot, not the revision.
  const { rows, plan } = feed;

  const view = useMemo(
    () =>
      snapshot
        ? keepUnchangedItems(
            previous.current,
            translate(shownRows({ rows, plan }), snapshot),
          )
        : null,
    [rows, plan, snapshot, translate],
  );

  useEffect(() => {
    previous.current = view;
  }, [view]);

  return view;
}
