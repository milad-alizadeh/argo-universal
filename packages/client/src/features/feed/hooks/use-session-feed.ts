import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPCClient } from '#features/connection';
import { feedKey, feedPageSize } from '../api/feed-query';
import { emptyFeed, type FeedState, mergeOlderPage } from '../view/feed-state';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { newestWorkRevision } from '../view/work-revision';
import type { SessionFeed } from './session-feed';
import { useFeedLive } from './use-feed-live';
import { useFeedWindow } from './use-feed-window';

// A Session's Feed view, kept in the query cache with its paging and live changes (ADR 0007). While not `shown` the live subscription is closed and nothing is written; showing it again opens the subscription after the newest revision the cache holds.
export function useSessionFeed(
  sessionId: string | undefined,
  translate = toFeedView,
  shown = true,
): SessionFeed {
  const { feed, snapshot, view, query } = useFeedWindow(sessionId, translate, {
    cacheId: sessionId,
    tail: true,
  });

  const live = useFeedLive(sessionId, {
    cacheId: sessionId,
    shown,
    loaded: feed.epoch !== null,
  });

  const older = useOlderHistory(sessionId);

  return {
    view,
    snapshot,
    hasOlder: feed.epoch === null || feed.hasOlder,
    historyCursor: feed.startCursor,
    revision: feed.revision,
    workRevision: newestWorkRevision(feed.rows),
    liveToolCall: findLiveToolCall(feed.rows, snapshot),
    permissionToolCall: findPermissionToolCall(feed.rows, snapshot, sessionId),
    ready: feed.epoch !== null && snapshot !== null,
    error: query.error,
    retry: () => void query.refetch(),
    loadingOlder: older.isPending,
    loadOlder: async () => {
      if (!older.isPending) await older.mutateAsync().catch(() => {});
    },
    openError: live.closure?.error ?? live.changes.error,
    retryOpen: live.retryOpen,
    resumeAfterCommand: () => {
      if (live.closure) live.retryOpen();
    },
  };
}

// Older rows merge into the same query; a failed page is not a Feed error, and scrolling asks again.
function useOlderHistory(
  sessionId: string | undefined,
): ReturnType<typeof useMutation<void, Error>> {
  const queryClient = useQueryClient();
  const client = useTRPCClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { epoch, hasOlder, startCursor } =
        queryClient.getQueryData<FeedState>(feedKey(sessionId ?? '')) ??
        emptyFeed;

      if (epoch === null || !hasOlder || startCursor === null) return;

      const page = await client.feed.page.query({
        sessionId: sessionId ?? '',
        direction: 'before',
        cursor: startCursor,
        epoch,
        limit: feedPageSize,
      });

      queryClient.setQueryData<FeedState>(
        feedKey(sessionId ?? ''),
        (held = emptyFeed) => mergeOlderPage(held, page),
      );
    },
  });
}
