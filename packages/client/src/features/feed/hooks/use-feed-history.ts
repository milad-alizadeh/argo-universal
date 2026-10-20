import type { FeedPageInput, FeedPageOutput } from '@repo/contracts';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTRPC, useTRPCClient } from '#features/connection';
import { type HistoryWindow, needsOlderHistory } from '../view/feed-history';
import { revisitGraceMs } from './held-feed';

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

export function useFeedHistory(
  sessionId: string | undefined,
  { epoch, startCursor }: HistoryWindow,
): FeedHistory {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();

  const queryKey = trpc.feed.page.infiniteQueryKey({
    sessionId: sessionId ?? '',
    limit: pageSize,
  });

  const history = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      client.feed.page.query(
        { sessionId: sessionId ?? '', limit: pageSize, ...pageParam },
        { signal },
      ),
    enabled: sessionId !== undefined,
    initialPageParam,
    getNextPageParam: olderCursor,
    staleTime: Infinity,
    gcTime: revisitGraceMs,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = history;

  const loadOlder = useCallback(async (): Promise<void> => {
    if (!hasNextPage || isFetchingNextPage) return;
    const window = { epoch, startCursor };
    // Two start-reached signals can land before a render updates the guard; the second must join the page in flight, not cancel and refetch it.
    let result = await fetchNextPage({ cancelRefetch: false });

    while (
      result.isSuccess &&
      result.hasNextPage &&
      needsOlderHistory(result.data.pages.at(-1), window)
    ) {
      result = await fetchNextPage({ cancelRefetch: false });
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, epoch, startCursor]);

  const resetHistory = useCallback(
    (): Promise<void> =>
      queryClient.resetQueries({
        queryKey: trpc.feed.page.infiniteQueryKey({
          sessionId: sessionId ?? '',
          limit: pageSize,
        }),
        exact: true,
      }),
    [queryClient, trpc, sessionId],
  );

  return { ...history, loadOlder, resetHistory };
}
