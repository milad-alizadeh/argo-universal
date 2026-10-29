import type { FeedSubscribeOutput } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import {
  type TRPCSubscriptionResult,
  useSubscription,
} from '@trpc/tanstack-react-query';
import { useCallback, useEffect } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import { mergeHistoryPages } from '../view/feed-history';
import { applySubscriptionEvent, syncPointOf } from '../view/feed-state';
import { dispatchFeedEvent, retryFeed } from './feed-live-events';
import {
  subscriptionInput,
  subscriptionEnabled,
} from './feed-subscription-input';
import { useFeedHistory } from './use-feed-history';
import type { FeedStore } from './use-feed-store';
import { useFeedSyncPoint } from './use-feed-sync-point';

const uncached = { staleTime: 0, gcTime: 0 };

type History = ReturnType<typeof useFeedHistory>;

export interface LiveFeed {
  error: ClientError | null;
  retryOpen: () => void;
}

export function useLiveFeed(
  sessionId: string | undefined,
  store: FeedStore,
  history: History,
): LiveFeed {
  const cursor = useFeedCursor(sessionId, store, history);

  useHistoryPages(store, history);

  const changes = useLiveSubscription(sessionId, store, {
    syncPoint: cursor.syncPoint,
    resetHistory: history.resetHistory,
  });

  const retryOpen = useRetryOpen(store, { ...cursor, reset: changes.reset });

  return { error: changes.error, retryOpen };
}

function useFeedCursor(
  sessionId: string | undefined,
  store: FeedStore,
  history: History,
): ReturnType<typeof useFeedSyncPoint> {
  return useFeedSyncPoint(
    sessionId,
    store.start.syncPoint,
    history.data?.pages[0],
  );
}

function useLiveSubscription(
  sessionId: string | undefined,
  store: FeedStore,
  input: {
    syncPoint: ReturnType<typeof syncPointOf>;
    resetHistory: () => Promise<void>;
  },
): TRPCSubscriptionResult<FeedSubscribeOutput, ClientError> {
  const fetchWholeRow = useFetchWholeRow(sessionId, store);

  const onData = useLiveEvents(sessionId, store, { ...input, fetchWholeRow });

  return useTransportSubscription({ ...input, sessionId, onData });
}

type TransportInput = {
  sessionId: string | undefined;
  syncPoint: ReturnType<typeof syncPointOf>;
  onData: (event: FeedSubscribeOutput) => void;
};

function useTransportSubscription(
  input: TransportInput,
): TRPCSubscriptionResult<FeedSubscribeOutput, ClientError> {
  const options = useTRPC().feed.subscribe.subscriptionOptions(
    subscriptionInput(input),
  );

  return useSubscription({
    ...options,
    enabled: subscriptionEnabled(input),
    onData: input.onData,
  });
}

function useHistoryPages(store: FeedStore, history: History): void {
  const { feedRef, replaceFeed } = store;
  useEffect(() => {
    const pages = history.data?.pages;

    if (pages) replaceFeed(mergeHistoryPages(feedRef.current, pages));
  }, [history.data, replaceFeed, feedRef]);
}

function useFetchWholeRow(
  sessionId: string | undefined,
  { feedRef, replaceFeed }: FeedStore,
): (id: string) => Promise<void> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useCallback(
    (id: string) =>
      fetchWholeRow({ queryClient, trpc, sessionId, feedRef, replaceFeed }, id),
    [queryClient, trpc, sessionId, replaceFeed, feedRef],
  );
}

type FetchContext = Pick<FeedStore, 'feedRef' | 'replaceFeed'> & {
  queryClient: ReturnType<typeof useQueryClient>;
  trpc: ReturnType<typeof useTRPC>;
  sessionId: string | undefined;
};

async function fetchWholeRow(input: FetchContext, id: string): Promise<void> {
  try {
    const row = await input.queryClient.fetchQuery({
      ...input.trpc.feed.row.queryOptions({
        sessionId: input.sessionId ?? '',
        id,
      }),
      ...uncached,
    });

    commitWholeRow(input, row);
  } catch {
    // The row keeps its last revision until a later change fetches it again.
  }
}

function commitWholeRow(
  input: FetchContext,
  row: Extract<FeedSubscribeOutput, { type: 'row.upsert' }>['row'],
): void {
  input.replaceFeed(
    applySubscriptionEvent(input.feedRef.current, {
      type: 'row.upsert',
      rev: row.revision,
      row,
    }).feed,
  );
}

function useLiveEvents(
  sessionId: string | undefined,
  store: FeedStore,
  input: {
    fetchWholeRow: (id: string) => Promise<void>;
    resetHistory: () => Promise<void>;
  },
): (event: FeedSubscribeOutput) => void {
  return (event) => dispatchFeedEvent(event, { ...store, ...input, sessionId });
}

function useRetryOpen(
  store: FeedStore,
  input: {
    syncPoint: ReturnType<typeof syncPointOf>;
    setSyncPoint: (point: ReturnType<typeof syncPointOf>) => void;
    reset: () => void;
  },
): () => void {
  return () => retryFeed({ ...store, ...input });
}
