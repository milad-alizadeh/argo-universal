import type {
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { inferRouterOutputs } from '@trpc/server';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTRPC } from '../trpc/context';
import {
  applySubscriptionEvent,
  emptyFeed,
  type FeedState,
  mergeNewestPage,
  mergeOlderPage,
} from './feed-state';
import type { FeedView } from './feed-view';
import { keepUnchangedItems } from './keep-unchanged-items';
import { toFeedView } from './to-feed-view';

type FeedPageQuery = ReturnType<
  typeof useQuery<
    inferRouterOutputs<AppRouter>['feed']['page'],
    TRPCClientErrorLike<AppRouter>
  >
>;
interface SessionFeed extends ReturnType<typeof useOlderPages> {
  view: FeedView | null;
  liveToolCall: ToolCallUpdate | undefined;
  snapshot: SessionSnapshot | null;
  ready: boolean;
  error: FeedPageQuery['error'];
  retry: FeedPageQuery['refetch'];
  openError: Error | TRPCClientErrorLike<AppRouter> | null;
  retryOpen: () => void;
  resumeAfterCommand: () => void;
}

// Rows per page (ADR-0007 pages by position): long enough that paging rarely shows while reading back.
const pageSize = 150;

// A fetch the hook keeps in its own state, so the query cache never holds it.
const uncached = { staleTime: 0, gcTime: 0 };

// A Session's held Feed view, paging and live changes (ADR 0007).
export function useSessionFeed(sessionId: string): SessionFeed {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const newestPage = useQuery(
    trpc.feed.page.queryOptions(
      { sessionId, direction: 'tail', limit: pageSize },
      { staleTime: Number.POSITIVE_INFINITY, gcTime: 0 },
    ),
  );
  const [feed, setFeed] = useState<FeedState>(emptyFeed);
  const feedRef = useRef(feed);
  const replaceFeed = useCallback((next: FeedState) => {
    feedRef.current = next;
    setFeed(next);
  }, []);
  const closed = useRef(false);
  const [closureError, setClosureError] = useState<Error | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  // Pages advance the held revision without restarting live updates.
  const [syncPoint, setSyncPoint] = useState<FeedSyncPoint | null>(null);
  const { loadingOlder, loadOlder } = useOlderPages({
    sessionId,
    getFeed: useCallback(() => feedRef.current, []),
    replaceFeed,
  });

  useEffect(() => {
    if (!newestPage.data) return;
    replaceFeed(mergeNewestPage(feedRef.current, newestPage.data));
    setSyncPoint(
      (current) =>
        current ?? {
          epoch: newestPage.data.epoch,
          revision: newestPage.data.maxRevision,
        },
    );
  }, [newestPage.data, replaceFeed]);

  const fetchWholeRow = useCallback(
    async (id: string) => {
      try {
        const row = await queryClient.fetchQuery({
          ...trpc.feed.row.queryOptions({ sessionId, id }),
          ...uncached,
        });
        replaceFeed(
          applySubscriptionEvent(feedRef.current, {
            type: 'row.upsert',
            rev: row.revision,
            row,
          }).feed,
        );
      } catch {
        // The row keeps its last revision until a later change fetches it again.
      }
    },
    [queryClient, trpc, sessionId, replaceFeed],
  );

  const { refetch } = newestPage;
  const onLiveData = useCallback(
    (event: FeedSubscribeOutput): void => {
      if (event.type === 'closed') {
        closed.current = true;
        setClosureError(
          event.failure === null ? null : new Error(event.failure),
        );
        return;
      }
      if (event.type === 'snapshot') {
        setSnapshot(event.snapshot);
        return;
      }
      const result = applySubscriptionEvent(feedRef.current, event);
      replaceFeed(result.feed);
      if (result.missingRowId) void fetchWholeRow(result.missingRowId);
      if (result.reset) void refetch();
    },
    [replaceFeed, fetchWholeRow, refetch],
  );
  const liveChanges = useSubscription({
    ...trpc.feed.subscribe.subscriptionOptions({ sessionId, after: syncPoint }),
    enabled: syncPoint !== null,
    onData: onLiveData,
  });

  const reset = liveChanges.reset;
  const retryOpen = useCallback(() => {
    closed.current = false;
    setClosureError(null);
    const held = feedRef.current;
    if (held.epoch === null) return;
    const next = { epoch: held.epoch, revision: held.revision };
    // A changed input resets useSubscription after it commits; the same input needs an explicit reset.
    if (syncPoint?.epoch === next.epoch && syncPoint.revision === next.revision)
      reset();
    else setSyncPoint(next);
  }, [syncPoint, reset]);

  const [held, setHeld] = useState(() => ({
    rows: feed.rows,
    snapshot,
    view: snapshot ? toFeedView(feed.rows, snapshot) : null,
  }));
  let view = held.view;
  if (held.rows !== feed.rows || held.snapshot !== snapshot) {
    view = snapshot
      ? keepUnchangedItems(held.view, toFeedView(feed.rows, snapshot))
      : null;
    setHeld({ rows: feed.rows, snapshot, view });
  }

  return {
    view,
    liveToolCall: findLiveToolCall(feed.rows, snapshot),
    snapshot,
    // The first page and the snapshot have both arrived.
    ready: feed.epoch !== null && snapshot !== null,
    error: newestPage.error,
    retry: refetch,
    // The Server refused to open the Session, such as when its Agent failed.
    openError: closureError ?? liveChanges.error,
    retryOpen,
    resumeAfterCommand: () => {
      if (closed.current) retryOpen();
    },
    loadingOlder,
    loadOlder,
  };
}

function useOlderPages({
  sessionId,
  getFeed,
  replaceFeed,
}: {
  sessionId: string;
  getFeed: () => FeedState;
  replaceFeed: (next: FeedState) => void;
}): { loadingOlder: boolean; loadOlder: () => Promise<void> } {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const olderInFlight = useRef(false);
  // Pages the rows before the oldest held one, one request at a time.
  const loadOlder = useCallback(async () => {
    const { hasOlder, startCursor, epoch } = getFeed();
    if (olderInFlight.current || !hasOlder) return;
    if (startCursor === null || epoch === null) return;
    olderInFlight.current = true;
    setLoadingOlder(true);
    try {
      const page = await queryClient.fetchQuery({
        ...trpc.feed.page.queryOptions({
          sessionId,
          direction: 'before',
          cursor: startCursor,
          limit: pageSize,
          epoch,
        }),
        ...uncached,
      });
      replaceFeed(mergeOlderPage(getFeed(), page));
    } catch {
      // The rows stay as they were; the reader asks again by scrolling back to the top.
    } finally {
      olderInFlight.current = false;
      setLoadingOlder(false);
    }
  }, [queryClient, trpc, sessionId, replaceFeed, getFeed]);

  return { loadingOlder, loadOlder };
}

function findLiveToolCall(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot | null,
): ToolCallUpdate | undefined {
  const source = snapshot?.liveHeader?.source;
  if (source?.type !== 'tool_call') return undefined;
  return rows.findLast(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === source.toolCallId,
  );
}
