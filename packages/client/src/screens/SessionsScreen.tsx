import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { NotePencilIcon, SlidersHorizontalIcon } from 'phosphor-react-native';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { ConnectionBanner } from '#components/ConnectionBanner';
import { Icon } from '#components/Icon';
import { ListSearch } from '#components/ListSearch';
import { LoadError } from '#components/LoadError';
import { Screen } from '#components/Screen';
import { SessionsList } from '#components/SessionsList';
import { SessionsLoading } from '#components/SessionsLoading';
import { Button } from '#primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#primitives/dropdown-menu';
import { Text } from '#primitives/text';
import { useNavigate } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { useTRPC } from '../trpc/context';

export interface SessionsFilter {
  query: string;
  onQueryChange: (query: string) => void;
  archived: boolean;
  onArchivedChange: (archived: boolean) => void;
}

// The search and Active or Archived filter that the list header and the list share.
export function useSessionsFilter(): SessionsFilter {
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  return {
    query,
    onQueryChange: setQuery,
    archived,
    onArchivedChange: setArchived,
  };
}

// The Sessions part of the shell's list header row: the title with search, and the filter.
export function SessionsHeader({
  query,
  onQueryChange,
  archived,
  onArchivedChange,
}: SessionsFilter) {
  return (
    <>
      <ListSearch title="Sessions" value={query} onChangeText={onQueryChange} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 sm:size-11 wide:size-8 wide:sm:size-8"
            accessibilityLabel="Filter Sessions"
          >
            <Icon
              as={SlidersHorizontalIcon}
              className="size-5.5 wide:size-4 text-foreground wide:text-muted-foreground"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuRadioGroup
            value={archived ? 'archived' : 'active'}
            onValueChange={(value) => onArchivedChange(value === 'archived')}
          >
            <DropdownMenuRadioItem value="active">
              <Text>Active</Text>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="archived">
              <Text>Archived</Text>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export interface SessionsScreenProps {
  query: string;
  archived: boolean;
}

// The Sessions list below the shell's header row: phone full screen, or the wide window's sidebar.
export function SessionsScreen({ query, archived }: SessionsScreenProps) {
  const wide = useWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.list.queryOptions());
  const sessions = useInfiniteQuery(
    trpc.session.list.infiniteQueryOptions(
      { archived, query: query || undefined },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  );
  useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      onStarted: () => {
        void queryClient.invalidateQueries(trpc.session.list.pathFilter());
      },
      onData: () => {
        void queryClient.invalidateQueries(trpc.session.list.pathFilter());
      },
    }),
  );
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
  const selectSession = useCallback(
    (id: string) => navigate({ to: 'session', id }),
    [navigate],
  );
  const newSession = useCallback(
    (projectId: string) => navigate({ to: 'new-session', projectId }),
    [navigate],
  );
  const projectSettings = useCallback(
    (name: string) => navigate({ to: 'settings-project', name }),
    [navigate],
  );
  const fetchNextPage = sessions.fetchNextPage;
  const loadMore = useCallback(() => {
    if (sessions.hasNextPage && !sessions.isFetching) void fetchNextPage();
  }, [sessions.hasNextPage, sessions.isFetching, fetchNextPage]);
  const error = projects.isError || agents.isError || sessions.isLoadingError;
  const loading = projects.isPending || agents.isPending || sessions.isPending;
  function retry() {
    void projects.refetch();
    void agents.refetch();
    void sessions.refetch();
  }

  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-background wide:bg-sidebar"
      style={{ minHeight: 0 }}
    >
      <ConnectionBanner />
      <Text className="h-8 pl-4.5 pr-3 py-2 text-xs leading-4 font-medium text-muted-foreground">
        Projects
      </Text>
      {error && !loading ? (
        <LoadError
          title="Couldn't load Sessions"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={retry}
        />
      ) : loading ? (
        <SessionsLoading />
      ) : (
        <SessionsList
          projects={projects.data ?? []}
          agents={agents.data ?? []}
          sessions={rows}
          isFetchingNextPage={sessions.isFetchingNextPage}
          query={query}
          archived={archived}
          onNewSession={newSession}
          onProjectSettings={projectSettings}
          onSelect={selectSession}
          onEndReached={loadMore}
        />
      )}
      {sessions.isFetchNextPageError && (
        <LoadError
          title="Couldn't load more Sessions"
          description="Try loading the next page again."
          onRetry={() => {
            void sessions.fetchNextPage();
          }}
        />
      )}
      <View
        className={
          wide ? 'h-16 justify-center px-3' : 'absolute bottom-6 right-4'
        }
      >
        <Button
          accessibilityLabel="New Session"
          onPress={() => navigate({ to: 'new-session' })}
          className={
            wide
              ? 'h-9 sm:h-9 self-start flex-row gap-2 rounded-md px-3'
              : 'size-14 sm:size-14 rounded-full'
          }
        >
          <Icon
            as={NotePencilIcon}
            className="size-5.5 wide:size-4 text-primary-foreground"
          />
          <Text className="hidden wide:flex text-sm text-primary-foreground">
            New Session
          </Text>
        </Button>
      </View>
    </Screen>
  );
}
