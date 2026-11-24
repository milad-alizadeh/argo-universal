import { useState } from 'react';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { translateFeed } from '../view/to-feed-view';
import { newestWorkRevision } from '../view/work-revision';
import type { SessionFeed } from './session-feed';
import { useFeedLive } from './use-feed-live';
import {
  type FeedViewTranslator,
  useFeedWindow,
  useOlderHistory,
  useSessionPages,
} from './use-feed-window';

// A Session's Feed view, kept in the query cache with its paging and live changes (ADR 0007). While not `shown` the live subscription is closed and nothing is written; showing it again opens the subscription after the newest revision the cache holds.
export function useSessionFeed(
  sessionId: string | undefined,
  translate: FeedViewTranslator = translateFeed,
  shown = true,
): SessionFeed {
  const readPage = useSessionPages(sessionId);

  // A Server built before the tail and event ids refuses their keys, so the Feed is read by page, and its subscription opens with `after` alone (`useFeedLive`).
  const [refused, setRefused] = useState(false);

  // A shown Session's tail comes with its subscription; a hidden one, or one on a Server that refused, reads its page.
  const { cacheId, feed, snapshot, view, query } = useFeedWindow(
    sessionId,
    translate,
    { cacheId: sessionId, readPage, readsPage: !shown || refused },
  );

  const live = useFeedLive(sessionId, {
    cacheId,
    shown,
    held: feed.epoch !== null,
    refused,
    onRefused: () => setRefused(true),
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
    openError: live.openError,
    retryOpen: live.retryOpen,
    resumeAfterCommand: () => {
      if (live.closure) live.retryOpen();
    },
  };
}
