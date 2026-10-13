import type { FeedPageInput, FeedPageOutput } from '@repo/contracts';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC, useTRPCClient } from '#features/connection';

type HistoryCursor = Pick<FeedPageInput, 'direction' | 'cursor' | 'epoch'>;
type FeedHistory = Pick<
  UseInfiniteQueryResult<InfiniteData<FeedPageOutput>>,
  'data' | 'error' | 'refetch' | 'isFetchNextPageError' | 'isFetchingNextPage'
> & { loadOlder: () => Promise<void>; resetHistory: () => Promise<void> };
const initialPageParam: HistoryCursor = { direction: 'tail' };
const pageSize = 150;

const olderCursor = (page: FeedPageOutput): HistoryCursor | undefined =>
  page.hasOlder && page.startCursor !== null
    ? { direction: 'before', cursor: page.startCursor, epoch: page.epoch }
    : undefined;

export function useFeedHistory(sessionId: string): FeedHistory {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const queryKey = trpc.feed.page.infiniteQueryKey({
    sessionId,
    limit: pageSize,
  });
  const history = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      client.feed.page.query(
        { sessionId, limit: pageSize, ...pageParam },
        { signal },
      ),
    initialPageParam,
    getNextPageParam: olderCursor,
    staleTime: Infinity,
    gcTime: 0,
  });
  const { fetchNextPage, hasNextPage, isFetching } = history;
  const loadOlder = useCallback(async (): Promise<void> => {
    if (hasNextPage && !isFetching)
      await fetchNextPage({ cancelRefetch: false });
  }, [fetchNextPage, hasNextPage, isFetching]);
  const resetHistory = useCallback(
    (): Promise<void> =>
      queryClient.resetQueries({
        queryKey: trpc.feed.page.infiniteQueryKey({
          sessionId,
          limit: pageSize,
        }),
        exact: true,
      }),
    [queryClient, trpc, sessionId],
  );
  return { ...history, loadOlder, resetHistory };
}
