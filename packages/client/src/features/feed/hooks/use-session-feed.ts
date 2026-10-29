import type { FeedSubscribeOutput, SessionSnapshot } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTRPC } from '#features/connection';
import { closedFeedError } from '../utils/closed-feed-error';
import { mergeHistoryPages } from '../view/feed-history';
import {
  applySubscriptionEvent,
  type FeedState,
  syncPointOf,
} from '../view/feed-state';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { useHeldFeedStart, useKeepHeldFeed } from './held-feed';
import type { SessionFeed } from './session-feed';
import { useFeedHistory } from './use-feed-history';
import { useFeedSyncPoint } from './use-feed-sync-point';
import { useFeedView } from './use-feed-view';
import { useFrameCommit } from './use-frame-commit';

// A fetch the hook keeps in its own state, so the query cache never holds it.
const uncached = { staleTime: 0, gcTime: 0 };

// A Session's held Feed view, paging and live changes (ADR 0007).
export function useSessionFeed(
  sessionId: string | undefined,
  convert = toFeedView,
): SessionFeed {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const start = useHeldFeedStart(sessionId);
  const [feed, setFeed] = useState<FeedState>(start.feed);
  const history = useFeedHistory(sessionId, feed);
  const feedRef = useRef(feed);
  const activeSession = useRef(sessionId);
  const commit = useFrameCommit(setFeed, activeSession);

  /*
   * The rows held take the change at once, so the event after it reads the newest text; the commit
   * that rebuilds the view and redraws the list is left to the frame.
   */
  const replaceFeed = useCallback(
    (next: FeedState) => {
      if (activeSession.current !== sessionId) return;
      feedRef.current = next;
      commit.schedule(next);
    },
    [sessionId, commit],
  );

  const closed = useRef(false);
  useEffect(() => {
    activeSession.current = sessionId;
    feedRef.current = start.feed;
    closed.current = false;
  }, [sessionId, start.feed]);
  const [closureError, setClosureError] = useState<Error | null>(null);

  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(
    start.snapshot,
  );

  const { syncPoint, setSyncPoint } = useFeedSyncPoint(
    sessionId,
    start.syncPoint,
    history.data?.pages[0],
  );

  useKeepHeldFeed(sessionId, { feed, snapshot });
  useEffect(() => {
    const pages = history.data?.pages;

    if (pages) replaceFeed(mergeHistoryPages(feedRef.current, pages));
  }, [history.data, replaceFeed]);

  const fetchWholeRow = useCallback(
    async (id: string) => {
      try {
        const row = await queryClient.fetchQuery({
          ...trpc.feed.row.queryOptions({ sessionId: sessionId ?? '', id }),
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
      if (activeSession.current !== sessionId) return;

      if (event.type === 'closed') {
        closed.current = true;
        setClosureError(closedFeedError(event));

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
    [replaceFeed, fetchWholeRow, resetHistory, sessionId],
  );

  const liveChanges = useSubscription({
    ...trpc.feed.subscribe.subscriptionOptions({
      sessionId: sessionId ?? '',
      after: syncPoint,
    }),
    enabled: sessionId !== undefined && syncPoint !== null,
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
  }, [syncPoint, reset, setSyncPoint]);

  const view = useFeedView(sessionId, feed, { snapshot, convert });

  const [shownSession, setShownSession] = useState(sessionId);

  // Session identity changes reset the held read before any view can show another Session's data.
  if (shownSession !== sessionId) {
    setShownSession(sessionId);
    // A commit held for the Session just left would otherwise land over this one's first page.
    commit.cancel();
    setFeed(start.feed);
    setSnapshot(start.snapshot);
    setClosureError(null);
  }

  return {
    view,
    revision: feed.revision,
    liveToolCall: findLiveToolCall(feed.rows, snapshot),
    permissionToolCall: findPermissionToolCall(feed.rows, snapshot, sessionId),
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
