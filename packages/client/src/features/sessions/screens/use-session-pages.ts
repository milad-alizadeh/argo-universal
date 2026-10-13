import type { AppRouter } from '@repo/engine/router';
import {
  type InfiniteData,
  keepPreviousData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
} from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { useCallback, useMemo } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import type { SessionsViewProps } from '../components/sessions-view/sessions-view';
import type { QueryProgress } from '../state/sessions-load-state';

type SessionsSearch = Pick<SessionsViewProps, 'archived' | 'query'>;

type SessionPages = Pick<
  SessionsViewProps,
  'sessions' | 'loadMoreFailed' | 'isFetchingNextPage' | 'onLoadMore'
> & { progress: QueryProgress };

type SessionListQuery = UseInfiniteQueryResult<
  InfiniteData<
    inferRouterOutputs<AppRouter>['session']['list'],
    inferRouterInputs<AppRouter>['session']['list']['cursor'] | null
  >,
  ClientError
>;

function useSessionListQuery({
  archived,
  query,
}: SessionsSearch): SessionListQuery {
  const trpc = useTRPC();

  return useInfiniteQuery(
    trpc.session.list.infiniteQueryOptions(
      { archived, query: query || undefined },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        // Typing a search keeps the last results up instead of flashing the skeleton.
        placeholderData: keepPreviousData,
      },
    ),
  );
}

function useUniqueSessions(
  data: SessionListQuery['data'],
): SessionsViewProps['sessions'] {
  return useMemo(
    () => [
      ...new Map(
        data?.pages
          .flatMap((page) => page.sessions)
          .map((session) => [session.sessionId, session]),
      ).values(),
    ],
    [data],
  );
}

function useLoadMore({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: SessionListQuery): () => void {
  return useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
}

// The Sessions matching a search, a page at a time.
export function useSessionPages(search: SessionsSearch): SessionPages {
  const sessions = useSessionListQuery(search);

  return {
    sessions: useUniqueSessions(sessions.data),
    loadMoreFailed: sessions.isFetchNextPageError,
    isFetchingNextPage: sessions.isFetchingNextPage,
    onLoadMore: useLoadMore(sessions),
    progress: { failed: sessions.isLoadingError, pending: sessions.isPending },
  };
}
