import type { FeedPageInput, FeedPageOutput } from '@repo/contracts';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC, useTRPCClient } from '#features/connection';
import { type HistoryWindow, needsOlderHistory } from '../view/feed-history';
import { revisitGraceMs } from './kept-feeds';

type HistoryCursor = Pick<FeedPageInput, 'direction' | 'cursor' | 'epoch'>;

type FeedHistory = Pick<
  UseInfiniteQueryResult<InfiniteData<FeedPageOutput>>,
  'data' | 'error' | 'refetch' | 'isFetchNextPageError' | 'isFetchingNextPage'
> & { loadOlder: () => Promise<void> };

const initialPageParam: HistoryCursor = { direction: 'tail' };

const pageSize = 150;

const olderCursor = (page: FeedPageOutput): HistoryCursor | undefined =>
  page.hasOlder && page.startCursor !== null
    ? { direction: 'before', cursor: page.startCursor, epoch: page.epoch }
    : undefined;

export function useFeedHistory(
  sessionId: string | undefined,
  { epoch, startCursor }: HistoryWindow,
): FeedHistory {
  const history = useHistoryQuery(sessionId);
  const loadOlder = useLoadOlder(history, { epoch, startCursor });

  return { ...history, loadOlder };
}

function useHistoryQuery(
  sessionId: string | undefined,
): UseInfiniteQueryResult<InfiniteData<FeedPageOutput>> {
  const trpc = useTRPC();
  const client = useTRPCClient();

  return useInfiniteQuery(historyOptions(sessionId, { trpc, client }));
}

type HistoryDeps = {
  trpc: ReturnType<typeof useTRPC>;
  client: ReturnType<typeof useTRPCClient>;
};

type HistoryOptions = UseInfiniteQueryOptions<
  FeedPageOutput,
  Error,
  InfiniteData<FeedPageOutput>,
  readonly unknown[],
  HistoryCursor
>;

function historyOptions(
  sessionId: string | undefined,
  { trpc, client }: HistoryDeps,
): HistoryOptions {
  return {
    queryKey: historyKey(trpc, sessionId),
    queryFn: ({ pageParam, signal }): Promise<FeedPageOutput> =>
      fetchPage({ client, sessionId }, { pageParam, signal }),
    enabled: sessionId !== undefined,
    initialPageParam,
    getNextPageParam: olderCursor,
    staleTime: Infinity,
    gcTime: revisitGraceMs,
  };
}

function historyKey(
  trpc: HistoryDeps['trpc'],
  sessionId: string | undefined,
): ReturnType<HistoryDeps['trpc']['feed']['page']['infiniteQueryKey']> {
  return trpc.feed.page.infiniteQueryKey({
    sessionId: sessionId ?? '',
    limit: pageSize,
  });
}

function fetchPage(
  {
    client,
    sessionId,
  }: { client: HistoryDeps['client']; sessionId: string | undefined },
  { pageParam, signal }: { pageParam: HistoryCursor; signal: AbortSignal },
): Promise<FeedPageOutput> {
  return client.feed.page.query(
    { sessionId: sessionId ?? '', limit: pageSize, ...pageParam },
    { signal },
  );
}

async function loadOlderPages(
  fetchNextPage: ReturnType<typeof useHistoryQuery>['fetchNextPage'],
  window: HistoryWindow,
): Promise<void> {
  // Two start-reached signals can land before a render updates the guard; join the page in flight.
  let result = await fetchNextPage({ cancelRefetch: false });

  while (needsAnotherPage(result, window)) {
    result = await fetchNextPage({ cancelRefetch: false });
  }
}

function needsAnotherPage(
  result: Awaited<
    ReturnType<ReturnType<typeof useHistoryQuery>['fetchNextPage']>
  >,
  window: HistoryWindow,
): boolean {
  return (
    result.isSuccess &&
    result.hasNextPage &&
    needsOlderHistory(result.data.pages.at(-1), window)
  );
}

function useLoadOlder(
  history: ReturnType<typeof useHistoryQuery>,
  { epoch, startCursor }: HistoryWindow,
): () => Promise<void> {
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = history;

  return useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    await loadOlderPages(fetchNextPage, { epoch, startCursor });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, epoch, startCursor]);
}

// Drops the pages held, so the Session's history pages its tail again.
export function useResetHistory(
  sessionId: string | undefined,
): () => Promise<void> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.resetQueries({
        queryKey: historyKey(trpc, sessionId),
        exact: true,
      }),
    [queryClient, trpc, sessionId],
  );
}
