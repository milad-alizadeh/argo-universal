import type { FeedSubscribeOutput, FeedSyncPoint } from '@repo/contracts';
import {
  type TRPCSubscriptionResult,
  useSubscription,
} from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import type {
  FeedViewTranslator,
  SessionFeedState,
  SessionFeedStore,
} from '../stores';
import { useFeedHistory } from './use-feed-history';
import {
  type SessionFeedHandle,
  useSessionFeedStore,
} from './use-session-feed-store';

export type FeedHistory = ReturnType<typeof useFeedHistory>;

export type LiveChanges = TRPCSubscriptionResult<
  FeedSubscribeOutput,
  ClientError
>;

export interface FeedSources extends SessionFeedHandle {
  history: FeedHistory;
  changes: LiveChanges;
}

// A closed subscription has no sync point to open at.
const livePoint = (
  state: SessionFeedState,
  shown: boolean,
): FeedSyncPoint | null => (shown ? state.syncPoint : null);

export function useFeedSources(
  sessionId: string | undefined,
  translate: FeedViewTranslator,
  shown: boolean,
): FeedSources {
  const handle = useSessionFeedStore(sessionId, translate, {
    cacheId: sessionId,
    shown,
  });

  return {
    ...handle,
    history: useMergedHistory(sessionId, handle),
    changes: useLiveChanges(sessionId, handle, shown),
  };
}

// The live subscription, open only while shown.
function useLiveChanges(
  sessionId: string | undefined,
  { store, state }: SessionFeedHandle,
  shown: boolean,
): LiveChanges {
  return useFeedLiveChanges(sessionId, store, livePoint(state, shown));
}

// The Session's history pages, merged into its store as they load.
function useMergedHistory(
  sessionId: string | undefined,
  { store, state }: SessionFeedHandle,
): FeedHistory {
  const history = useFeedHistory(sessionId, state.feed);
  useFeedHistoryPages(store, history.data);

  return history;
}

export function useFeedHistoryPages(
  store: SessionFeedStore,
  data: FeedHistory['data'],
): void {
  useEffect(() => {
    if (data) store.mergeHistory(data.pages);
  }, [store, data]);
}

export function useFeedLiveChanges(
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
