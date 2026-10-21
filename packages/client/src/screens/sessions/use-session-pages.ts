import type { AppRouter } from '@repo/engine/router';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import {
  type InfiniteData,
  keepPreviousData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { useCallback, useEffect, useMemo } from 'react';
import { type ClientError, useTRPC } from '#features/connection';
import {
  chooseSessionsView,
  olderServerView,
  type QueryProgress,
  type SessionsView,
  sessionsListInput,
  useSessionsViewKept,
} from '#features/sessions';
import type { SessionListViewProps } from './session-list-view';

type SessionsSearch = Pick<SessionListViewProps, 'view' | 'query'>;

type SessionPages = Pick<
  SessionListViewProps,
  'sessions' | 'loadMoreFailed' | 'isFetchingNextPage' | 'onLoadMore'
> & { progress: QueryProgress };

type SessionListQuery = UseInfiniteQueryResult<
  InfiniteData<
    inferRouterOutputs<AppRouter>['session']['list'],
    inferRouterInputs<AppRouter>['session']['list']['cursor'] | null
  >,
  ClientError
>;

/*
 * The Server pages most recently active first, so the pages loaded so far are the newest.
 * The list waits, pending behind its skeleton, until the view this Device kept has loaded.
 */
function useSessionListQuery({
  view,
  query,
}: SessionsSearch): SessionListQuery {
  const trpc = useTRPC();
  const viewKept = useSessionsViewKept();

  return useInfiniteQuery(
    trpc.session.list.infiniteQueryOptions(sessionsListInput(view, query), {
      enabled: viewKept,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      // Typing a search keeps the last results up instead of flashing the skeleton.
      placeholderData: keepPreviousData,
    }),
  );
}

function useUniqueSessions(
  data: SessionListQuery['data'],
): SessionListViewProps['sessions'] {
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

// The tRPC code the first page failed with, if it failed.
const firstPageFailure = ({
  error,
  isLoadingError,
}: SessionListQuery): string | undefined =>
  isLoadingError ? error.data?.code : undefined;

const newerServerToast: ErrorToast = {
  title: 'This view needs a newer Server',
  message: 'Update the Server to list All.',
};

/*
 * A Server from before Status All refuses the view this Device kept, so the list would fail on every launch.
 * Its first page failing that way puts the status back to Active, which the menu then shows and the list asks for;
 * the list stays behind its skeleton meanwhile. Returns whether it is falling back.
 */
function useOlderServerFallback(
  view: SessionsView,
  sessions: SessionListQuery,
): boolean {
  const client = useQueryClient();
  const fallback = olderServerView(view, firstPageFailure(sessions));

  useEffect(() => {
    if (fallback) chooseSessionsView(client, fallback);
  }, [client, fallback]);

  useErrorToast(fallback && newerServerToast);

  return fallback !== undefined;
}

// The Sessions matching a search, a page at a time.
export function useSessionPages(search: SessionsSearch): SessionPages {
  const sessions = useSessionListQuery(search);
  const fallingBack = useOlderServerFallback(search.view, sessions);

  return {
    sessions: useUniqueSessions(sessions.data),
    loadMoreFailed: sessions.isFetchNextPageError,
    isFetchingNextPage: sessions.isFetchingNextPage,
    onLoadMore: useLoadMore(sessions),
    progress: {
      failed: sessions.isLoadingError && !fallingBack,
      pending: sessions.isPending || fallingBack,
    },
  };
}
