import type { SessionFeedState, SessionFeedStore } from '../stores';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import { newestWorkRevision } from '../view/work-revision';
import type { SessionFeed } from './session-feed';
import {
  type FeedHistory,
  type FeedSources,
  type LiveChanges,
  useFeedSources,
} from './use-feed-sources';

// A Session's held Feed view, paging and live changes (ADR 0007). While not `shown` the live subscription is closed and nothing commits; showing it again opens the subscription after the rows held.
export function useSessionFeed(
  sessionId: string | undefined,
  translate = toFeedView,
  shown = true,
): SessionFeed {
  const sources = useFeedSources(sessionId, translate, shown);

  return feedOf(sessionId, sources);
}

function feedOf(
  sessionId: string | undefined,
  { store, state, history, changes }: FeedSources,
): SessionFeed {
  return {
    ...feedDisplay(state, sessionId),
    ...feedPaging(history),
    ...feedConnection(store, { state, changes }),
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

const feedRevisions = (
  feed: SessionFeedState['feed'],
): Pick<SessionFeed, 'revision' | 'workRevision'> => ({
  revision: feed.revision,
  workRevision: newestWorkRevision(feed.rows),
});

function feedDisplay(
  { feed, view, snapshot }: SessionFeedState,
  sessionId: string | undefined,
): FeedDisplay {
  return {
    view,
    hasOlder: feed.epoch === null || feed.hasOlder,
    historyCursor: feed.startCursor,
    ...feedRevisions(feed),
    liveToolCall: findLiveToolCall(feed.rows, snapshot),
    permissionToolCall: findPermissionToolCall(feed.rows, snapshot, sessionId),
    snapshot,
    ready: feed.epoch !== null && snapshot !== null,
  };
}

function feedPaging(
  history: FeedHistory,
): Pick<SessionFeed, 'error' | 'retry' | 'loadingOlder' | 'loadOlder'> {
  return {
    error: history.isFetchNextPageError ? null : history.error,
    retry: () => void history.refetch(),
    loadingOlder: history.isFetchingNextPage,
    loadOlder: history.loadOlder,
  };
}

function feedConnection(
  store: SessionFeedStore,
  { state, changes }: { state: SessionFeedState; changes: LiveChanges },
): Pick<SessionFeed, 'openError' | 'retryOpen' | 'resumeAfterCommand'> {
  const retryOpen = (): void => {
    if (store.retryOpen()) changes.reset();
  };

  return {
    openError: state.closure?.error ?? changes.error,
    retryOpen,
    resumeAfterCommand: () => {
      if (store.getState().closure) retryOpen();
    },
  };
}
