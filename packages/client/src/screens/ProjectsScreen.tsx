import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import {
  MagnifyingGlassIcon,
  NotePencilIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ConnectionBanner } from '#components/ConnectionBanner';
import { Icon } from '#components/Icon';
import { LoadError } from '#components/LoadError';
import { ProjectsList } from '#components/ProjectsList';
import { ProjectsLoading } from '#components/ProjectsLoading';
import { Screen } from '#components/Screen';
import { Button } from '#primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '#primitives/dropdown-menu';
import { Input } from '#primitives/input';
import { Text } from '#primitives/text';
import { useNavigate } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { useTRPC } from '../trpc/context';

export function ProjectsScreen() {
  const wide = useWide();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
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
  const error = projects.isError || agents.isError || sessions.isLoadingError;
  const loading = projects.isPending || agents.isPending || sessions.isPending;
  function closeSearch() {
    setSearching(false);
    setQuery('');
  }
  function retry() {
    void projects.refetch();
    void agents.refetch();
    void sessions.refetch();
  }

  return (
    <Screen
      className="relative flex-1 bg-background wide:bg-sidebar"
      style={{ minHeight: 0 }}
    >
      <ConnectionBanner />
      <View className="h-11 wide:h-14 flex-row items-center gap-0.5 px-2">
        {searching ? (
          <View className="relative min-w-0 flex-1 justify-center">
            <Input
              autoFocus
              accessibilityLabel="Search Sessions"
              placeholder="Search Sessions"
              value={query}
              onChangeText={setQuery}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Escape') closeSearch();
              }}
              className="h-8 sm:h-8 w-full pl-8 text-sm"
            />
            <View pointerEvents="none" className="absolute left-2.5">
              <Icon
                as={MagnifyingGlassIcon}
                className="size-3.5 text-muted-foreground"
              />
            </View>
          </View>
        ) : (
          <Text
            role="heading"
            aria-level={1}
            className="min-w-0 flex-1 pl-2 text-xl wide:text-base font-semibold"
          >
            Sessions
          </Text>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:size-11 wide:size-8 wide:sm:size-8"
          accessibilityLabel={searching ? 'Close search' : 'Search Sessions'}
          onPress={searching ? closeSearch : () => setSearching(true)}
        >
          <Icon
            as={searching ? XIcon : MagnifyingGlassIcon}
            className="size-5.5 wide:size-4 text-foreground wide:text-muted-foreground"
          />
        </Button>
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
              onValueChange={(value) => setArchived(value === 'archived')}
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
      </View>
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
        <ProjectsLoading />
      ) : (
        <ProjectsList
          projects={projects.data ?? []}
          agents={agents.data ?? []}
          sessions={rows}
          isFetchingNextPage={sessions.isFetchingNextPage}
          query={query}
          archived={archived}
          onNewSession={(projectId) =>
            navigate({ to: 'new-session', projectId })
          }
          onProjectSettings={(name) =>
            navigate({ to: 'settings-project', name })
          }
          onSelect={(id) => navigate({ to: 'session', id })}
          onEndReached={() => {
            if (sessions.hasNextPage && !sessions.isFetching)
              void sessions.fetchNextPage();
          }}
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
