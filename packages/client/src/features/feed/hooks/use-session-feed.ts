import type { FeedSubscribeOutput, FeedSyncPoint } from '@repo/contracts';
import {
  type TRPCSubscriptionResult,
  useSubscription,
} from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import type { SessionFeedState, SessionFeedStore } from '../stores';
import {
  findLiveToolCall,
  findPermissionToolCall,
} from '../view/live-tool-call';
import { toFeedView } from '../view/to-feed-view';
import type { SessionFeed } from './session-feed';
import { useFeedHistory } from './use-feed-history';
import { useSessionFeedStore } from './use-session-feed-store';

type FeedHistory = ReturnType<typeof useFeedHistory>;

type LiveChanges = TRPCSubscriptionResult<FeedSubscribeOutput, ClientError>;

// A Session's held Feed view, paging and live changes (ADR 0007).
export function useSessionFeed(
  sessionId: string | undefined,
  translate = toFeedView,
): SessionFeed {
  const { store, state } = useSessionFeedStore(sessionId, translate);
  const history = useFeedHistory(sessionId, state.feed);
  useHistoryPages(store, history.data);
  const changes = useLiveChanges(sessionId, store, state.syncPoint);

  return {
    ...feedDisplay(state, sessionId),
    ...feedPaging(history),
    ...feedConnection(store, { state, changes }),
  };
}

function useHistoryPages(
  store: SessionFeedStore,
  data: FeedHistory['data'],
): void {
  useEffect(() => {
    if (data) store.mergeHistory(data.pages);
  }, [store, data]);
}

function useLiveChanges(
  sessionId: string | undefined,
  store: SessionFeedStore,
  syncPoint: FeedSyncPoint | null,
): LiveChanges {
  const options = useTRPC().feed.subscribe.subscriptionOptions({
    sessionId: sessionId ?? '',
    after: syncPoint,
  });

  return useSubscription({
    ...options,
    enabled: sessionId !== undefined && syncPoint !== null,
    onData: store.receive,
  });
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
  { feed, view, snapshot }: SessionFeedState,
  sessionId: string | undefined,
): FeedDisplay {
  return {
    view,
    revision: feed.revision,
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
