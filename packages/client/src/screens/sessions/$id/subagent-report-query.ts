import type { FeedPageInput, FeedPageOutput } from '@repo/contracts';
import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useTRPC, useTRPCClient } from '#features/connection';

type Cursor = Pick<FeedPageInput, 'direction' | 'cursor' | 'epoch'>;

const initial: Cursor = { direction: 'tail' };

const nextPage = (page: FeedPageOutput): Cursor | undefined =>
  page.hasOlder && page.startCursor !== null
    ? { direction: 'before', cursor: page.startCursor, epoch: page.epoch }
    : undefined;

export type ReportQuery = UseInfiniteQueryResult<
  InfiniteData<FeedPageOutput>,
  Error
>;

type Options = UseInfiniteQueryOptions<
  FeedPageOutput,
  Error,
  InfiniteData<FeedPageOutput>,
  readonly unknown[],
  Cursor
>;

type QueryDeps = {
  trpc: ReturnType<typeof useTRPC>;
  client: ReturnType<typeof useTRPCClient>;
};

type Ids = { parentId: string; childId: string; epoch: number | undefined };

function reportKey(ids: Ids, trpc: QueryDeps['trpc']): readonly unknown[] {
  return [
    ...trpc.feed.reports.infiniteQueryKey({
      sessionId: ids.parentId,
      childSessionId: ids.childId,
      limit: 40,
    }),
    ids.epoch,
  ];
}

function fetchReportPage(
  client: QueryDeps['client'],
  ids: Ids,
  { pageParam, signal }: { pageParam: Cursor; signal: AbortSignal },
): Promise<FeedPageOutput> {
  return client.feed.reports.query(
    {
      sessionId: ids.parentId,
      childSessionId: ids.childId,
      limit: 40,
      ...pageParam,
    },
    { signal },
  );
}

function reportOptions(ids: Ids, { trpc, client }: QueryDeps): Options {
  return {
    queryKey: reportKey(ids, trpc),
    initialPageParam: initial,
    queryFn: ({ pageParam, signal }) =>
      fetchReportPage(client, ids, { pageParam, signal }),
    getNextPageParam: nextPage,
    staleTime: 0,
  };
}

export function useReportsPages(
  parentId: string,
  childId: string,
  epoch: number | undefined,
): ReportQuery {
  const trpc = useTRPC();
  const client = useTRPCClient();

  return useInfiniteQuery(
    reportOptions({ parentId, childId, epoch }, { trpc, client }),
  );
}
