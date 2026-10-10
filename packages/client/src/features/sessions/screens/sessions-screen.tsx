import type { SessionListUpdate } from '@repo/contracts';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { TRPCSubscriptionResult } from '@trpc/tanstack-react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import type { ClientError } from '#features/connection';
import {
  useConnectionState,
  useResubscribeOnReconnect,
  useTRPC,
} from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import { SessionsView } from '../components/sessions-view';
import { createCoalescedRefetch } from '../state/coalesced-refetch';
import { liveUpdatesStopped } from '../state/live-updates-stopped';
import { sessionsLoadState } from '../state/sessions-load-state';

export interface SessionsScreenProps {
  query: string;
  archived: boolean;
}

// The Sessions list: its queries and live updates, passed to the view as props.
export function SessionsScreen({
  query,
  archived,
}: SessionsScreenProps): React.JSX.Element {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.list.queryOptions());
  const sessions = useInfiniteQuery(
    trpc.session.list.infiniteQueryOptions(
      { archived, query: query || undefined },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        // Typing a search keeps the last results up instead of flashing the skeleton.
        placeholderData: keepPreviousData,
      },
    ),
  );
  const listUpdates = useSessionListUpdates();
  const connection = useConnectionState();
  const rows = useMemo(
    () => [
      ...new Map(
        sessions.data?.pages
          .flatMap((page) => page.sessions)
          .map((session) => [session.sessionId, session]),
      ).values(),
    ],
    [sessions.data],
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = sessions;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  return (
    <SessionsView
      loadState={sessionsLoadState([
        { failed: projects.isError, pending: projects.isPending },
        { failed: agents.isError, pending: agents.isPending },
        { failed: sessions.isLoadingError, pending: sessions.isPending },
      ])}
      connection={connection}
      liveUpdatesStopped={liveUpdatesStopped(listUpdates.status, connection)}
      loadMoreFailed={sessions.isFetchNextPageError}
      isFetchingNextPage={sessions.isFetchingNextPage}
      projects={projects.data ?? []}
      agents={agents.data ?? []}
      sessions={rows}
      query={query}
      archived={archived}
      onSelect={(id) => navigate({ to: 'session', id })}
      onNewSession={() => navigate({ to: 'new-session' })}
      onNewSessionInProject={(projectId) =>
        navigate({ to: 'new-session', projectId })
      }
      onProjectSettings={(name) => navigate({ to: 'settings-project', name })}
      onLoadMore={loadMore}
      onRetry={() => {
        void projects.refetch();
        void agents.refetch();
        void sessions.refetch();
      }}
      onRetryLiveUpdates={listUpdates.reset}
      onRetryLoadMore={() => {
        void sessions.fetchNextPage();
      }}
    />
  );
}

// Live list updates refetch its pages and resume after Connection recovery.
function useSessionListUpdates(): TRPCSubscriptionResult<
  SessionListUpdate,
  ClientError
> {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refetch = useMemo(
    () =>
      createCoalescedRefetch(() =>
        queryClient.invalidateQueries(trpc.session.list.pathFilter(), {
          cancelRefetch: false,
        }),
      ),
    [queryClient, trpc],
  );
  const subscription = useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      onStarted: refetch,
      onData: refetch,
    }),
  );
  useResubscribeOnReconnect(subscription);
  return subscription;
}
