import { useCallback, useState } from 'react';
import type { FeedCache } from '../api/feed-cache';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { newestWorkRevision } from '../view/work-revision';
import type { SessionFeed } from './session-feed';
import { type FeedLive, useFeedLive } from './use-feed-live';
import { type FeedWindow, useFeedWindow } from './use-feed-window';

// A Session's Feed view, kept in the query cache with its paging and live changes (ADR 0007). While not `shown` the live subscription is closed and nothing is written; showing it again opens the subscription after the newest revision the cache holds.
export function useSessionFeed(
  sessionId: string | undefined,
  translate = toFeedView,
  shown = true,
): SessionFeed {
  const window = useFeedWindow(sessionId, translate, {
    cacheId: sessionId,
    shown,
    tail: true,
  });
  const live = useFeedLive(sessionId, window.cache, shown);
  const older = useLoadOlder(window.cache);

  return {
    ...feedDisplay(window, sessionId),
    ...feedPaging(window, older),
    ...feedConnection(window, live),
  };
}

type FeedDisplay = Pick<
  SessionFeed,
  | 'view'
  | 'revision'
  | 'workRevision'
  | 'liveToolCall'
  | 'permissionToolCall'
  | 'snapshot'
  | 'ready'
  | 'hasOlder'
  | 'historyCursor'
>;

function feedDisplay(
  { feed, view, snapshot }: FeedWindow,
  sessionId: string | undefined,
): FeedDisplay {
  return {
    view,
    hasOlder: feed.epoch === null || feed.hasOlder,
    historyCursor: feed.startCursor,
    revision: feed.revision,
    workRevision: newestWorkRevision(feed.rows),
    liveToolCall: findLiveToolCall(feed.rows, snapshot),
    permissionToolCall: findPermissionToolCall(feed.rows, snapshot, sessionId),
    snapshot,
    ready: feed.epoch !== null && snapshot !== null,
  };
}

interface OlderHistory {
  loading: boolean;
  load: () => Promise<void>;
}

// Older rows merge into the same query; a failed page is not a Feed error, and scrolling asks again.
function useLoadOlder(cache: FeedCache): OlderHistory {
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await cache.loadOlder();
    } catch {
      // The next start-reached signal asks for the page again.
    } finally {
      setLoading(false);
    }
  }, [cache]);

  return { loading, load };
}

function feedPaging(
  { query }: FeedWindow,
  older: OlderHistory,
): Pick<SessionFeed, 'error' | 'retry' | 'loadingOlder' | 'loadOlder'> {
  return {
    error: query.error,
    retry: () => void query.refetch(),
    loadingOlder: older.loading,
    loadOlder: older.load,
  };
}

function feedConnection(
  { cache }: FeedWindow,
  { changes, closure, retryOpen }: FeedLive,
): Pick<SessionFeed, 'openError' | 'retryOpen' | 'resumeAfterCommand'> {
  return {
    openError: closure?.error ?? changes.error,
    retryOpen,
    resumeAfterCommand: () => {
      if (closure && cache.isShown()) retryOpen();
    },
  };
}
