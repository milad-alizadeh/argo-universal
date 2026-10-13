import type {
  FeedSubscribeOutput,
  FeedSyncPoint,
  SessionSnapshot,
  ToolCallUpdate,
} from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import { mergeHistoryPages } from '../view/feed-history';
import {
  applySubscriptionEvent,
  type FeedState,
  syncPointOf,
} from '../view/feed-state';
import type { FeedView } from '../view/feed-view';
import { keepUnchangedItems } from '../view/keep-unchanged-items';
import { findLiveToolCall } from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { useHeldFeedStart, useKeepHeldFeed } from './held-feed';
import { useFeedHistory } from './use-feed-history';

type FeedHistory = ReturnType<typeof useFeedHistory>;
interface SessionFeed {
  loadingOlder: boolean;
  loadOlder: FeedHistory['loadOlder'];
  view: FeedView | null;
  liveToolCall: ToolCallUpdate | undefined;
  snapshot: SessionSnapshot | null;
  ready: boolean;
  error: FeedHistory['error'];
  retry: FeedHistory['refetch'];
  openError: Error | ClientError | null;
  retryOpen: () => void;
  resumeAfterCommand: () => void;
}

// A fetch the hook keeps in its own state, so the query cache never holds it.
const uncached = { staleTime: 0, gcTime: 0 };

// A Session's held Feed view, paging and live changes (ADR 0007).
export function useSessionFeed(sessionId: string): SessionFeed {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const start = useHeldFeedStart(sessionId);
  const [feed, setFeed] = useState<FeedState>(start.feed);
  const history = useFeedHistory(sessionId, feed);
  const feedRef = useRef(feed);
  const replaceFeed = useCallback((next: FeedState) => {
    feedRef.current = next;
    setFeed(next);
  }, []);
  const closed = useRef(false);
  const [closureError, setClosureError] = useState<Error | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(
    start.snapshot,
  );
  // Pages advance the held revision without restarting live updates.
  const [syncPoint, setSyncPoint] = useState<FeedSyncPoint | null>(
    start.syncPoint,
  );
  useKeepHeldFeed(sessionId, { feed, snapshot });
  useEffect(() => {
    const pages = history.data?.pages;
    const first = pages?.[0];
    if (!pages || !first) return;
    replaceFeed(mergeHistoryPages(feedRef.current, pages));
    setSyncPoint(
      (current) =>
        current ?? { epoch: first.epoch, revision: first.maxRevision },
    );
  }, [history.data, replaceFeed]);

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

  const { resetHistory } = history;
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
      if (result.reset) void resetHistory();
    },
    [replaceFeed, fetchWholeRow, resetHistory],
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
    const next = syncPointOf(feedRef.current);
    if (next === null) return;
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
    error: history.isFetchNextPageError ? null : history.error,
    retry: history.refetch,
    // The Server refused to open the Session, such as when its Agent failed.
    openError: closureError ?? liveChanges.error,
    retryOpen,
    resumeAfterCommand: () => {
      if (closed.current) retryOpen();
    },
    loadingOlder: history.isFetchingNextPage,
    loadOlder: history.loadOlder,
  };
}
