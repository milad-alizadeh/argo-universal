import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import type { SessionFeed } from './session-feed';
import { useFeedHistory } from './use-feed-history';
import { useFeedStore, type FeedStore } from './use-feed-store';
import { useFeedView } from './use-feed-view';
import { useLiveFeed } from './use-live-feed';

// A Session's held Feed view, paging and live changes (ADR 0007).
export function useSessionFeed(
  sessionId: string | undefined,
  convert = toFeedView,
): SessionFeed {
  const store = useFeedStore(sessionId);
  const history = useFeedHistory(sessionId, store.feed);
  const live = useLiveFeed(sessionId, store, history);

  const view = useFeedView(sessionId, store.feed, {
    snapshot: store.snapshot,
    convert,
  });

  return feedResult({ store, history, live, view, sessionId });
}

type FeedResultInput = {
  sessionId: string | undefined;
  store: FeedStore;
  history: ReturnType<typeof useFeedHistory>;
  live: ReturnType<typeof useLiveFeed>;
  view: ReturnType<typeof useFeedView>;
};

function feedResult({
  store,
  history,
  live,
  view,
  sessionId,
}: FeedResultInput): SessionFeed {
  return {
    ...feedDisplay(store, view, sessionId),
    ...feedPaging(history),
    ...feedConnection(store, live),
  };
}

type FeedDisplay = Pick<
  SessionFeed,
  | 'view'
  | 'revision'
  | 'liveToolCall'
  | 'permissionToolCall'
  | 'snapshot'
  | 'ready'
>;

function feedDisplay(
  store: FeedStore,
  view: ReturnType<typeof useFeedView>,
  sessionId: string | undefined,
): FeedDisplay {
  return {
    view,
    revision: store.feed.revision,
    liveToolCall: findLiveToolCall(store.feed.rows, store.snapshot),
    permissionToolCall: permissionToolCall(store, sessionId),
    snapshot: store.snapshot,
    ready: store.feed.epoch !== null && store.snapshot !== null,
  };
}

type PermissionFeed = {
  feed: Pick<FeedStore['feed'], 'rows'>;
  snapshot: FeedStore['snapshot'];
};

const permissionToolCall = (
  store: PermissionFeed,
  sessionId: string | undefined,
): SessionFeed['permissionToolCall'] =>
  findPermissionToolCall(store.feed.rows, store.snapshot, sessionId);

function feedPaging(
  history: ReturnType<typeof useFeedHistory>,
): Pick<SessionFeed, 'error' | 'retry' | 'loadingOlder' | 'loadOlder'> {
  return {
    error: history.isFetchNextPageError ? null : history.error,
    retry: history.refetch,
    loadingOlder: history.isFetchingNextPage,
    loadOlder: history.loadOlder,
  };
}

function feedConnection(
  store: FeedStore,
  live: ReturnType<typeof useLiveFeed>,
): Pick<SessionFeed, 'openError' | 'retryOpen' | 'resumeAfterCommand'> {
  return {
    openError: store.closureError ?? live.error,
    retryOpen: live.retryOpen,
    resumeAfterCommand: () => {
      if (store.closed.current) live.retryOpen();
    },
  };
}
