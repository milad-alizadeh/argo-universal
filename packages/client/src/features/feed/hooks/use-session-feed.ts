import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { newestWorkRevision } from '../view/work-revision';
import type { SessionFeed } from './session-feed';
import { useFeedLive } from './use-feed-live';
import {
  useFeedWindow,
  useOlderHistory,
  useSessionPages,
} from './use-feed-window';

// A Session's Feed view, kept in the query cache with its paging and live changes (ADR 0007). While not `shown` the live subscription is closed and nothing is written; showing it again opens the subscription after the newest revision the cache holds.
export function useSessionFeed(
  sessionId: string | undefined,
  translate = toFeedView,
  shown = true,
): SessionFeed {
  const readPage = useSessionPages(sessionId);

  const { cacheId, feed, snapshot, view, query } = useFeedWindow(
    sessionId,
    translate,
    { cacheId: sessionId, readPage },
  );

  const live = useFeedLive(sessionId, {
    cacheId,
    shown,
    loaded: feed.epoch !== null,
  });

  const older = useOlderHistory(cacheId, readPage);

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
