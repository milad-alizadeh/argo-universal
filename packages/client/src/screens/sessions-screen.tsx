import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { NotePencilIcon, SlidersHorizontalIcon } from 'phosphor-react-native';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionBanner } from '#components/connection-banner';
import { HeaderButton } from '#components/header-button';
import { ListSearch } from '#components/list-search';
import { LoadError } from '#components/load-error';
import { Screen } from '#components/screen';
import { SessionsList } from '#components/sessions-list';
import { SessionsLoading } from '#components/sessions-loading';
import { hasLiquidGlass } from '#lib/native-header';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
// Relative, so Metro picks the .ios file.
import { ChoiceMenu } from '../components/choice-menu';
import { FloatingActionButton } from '../components/floating-action-button';
import {
  useConnectionState,
  useResubscribeOnReconnect,
} from '../connection/context';
import { Icon } from '../lib/icon';
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

// The Sessions part of the wide window's list header row: the title with search, and the filter.
export function SessionsHeader(filter: SessionsFilter) {
  return (
    <>
      <ListSearch
        title="Sessions"
        value={filter.query}
        onChangeText={filter.onQueryChange}
      />
      <SessionsFilterMenu {...filter} />
    </>
  );
}

const sessionsFilterChoices = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
] as const;

// Active or Archived; on a phone the trigger is a native header item with a dot while Archived shows.
export function SessionsFilterMenu({
  archived,
  onArchivedChange,
}: Pick<SessionsFilter, 'archived' | 'onArchivedChange'>) {
  const wide = useWide();
  return (
    <ChoiceMenu
      accessibilityLabel="Filter Sessions"
      value={archived ? 'archived' : 'active'}
      choices={sessionsFilterChoices}
      onValueChange={(value) => onArchivedChange(value === 'archived')}
      trigger={
        wide ? (
          <Button variant="ghost" size="icon" className="size-8 sm:size-8">
            <Icon
              as={SlidersHorizontalIcon}
              className="text-muted-foreground"
            />
          </Button>
        ) : (
          <HeaderButton
            icon={SlidersHorizontalIcon}
            paired
            dot={archived ? 'filter' : undefined}
            accessibilityLabel="Filter Sessions"
          />
        )
      }
    />
  );
}

// A phone's trailing header items, each its own button: the filter, then New Session on iOS, where it replaces the floating button.
export function sessionsHeaderItems(filter: SessionsFilter) {
  return [
    <SessionsFilterMenu key="filter" {...filter} />,
    ...(newSessionInHeader
      ? [<NewSessionHeaderButton key="new-session" />]
      : []),
  ];
}

function NewSessionHeaderButton() {
  const navigate = useNavigate();
  return (
    <HeaderButton
      icon={NotePencilIcon}
      paired
      accessibilityLabel="New Session"
      onPress={() => navigate({ to: 'new-session' })}
    />
  );
}

const newSessionInHeader = Platform.OS === 'ios';

export interface SessionsScreenProps {
  query: string;
  archived: boolean;
}

// The Sessions list below the shell's header row: phone full screen, or the wide window's sidebar.
export function SessionsScreen({ query, archived }: SessionsScreenProps) {
  const wide = useWide();
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
    if (sessions.hasNextPage && !sessions.isFetchingNextPage)
      void fetchNextPage();
  }, [sessions.hasNextPage, sessions.isFetchingNextPage, fetchNextPage]);
  const error = projects.isError || agents.isError || sessions.isLoadingError;
  const loading = projects.isPending || agents.isPending || sessions.isPending;
  function retry() {
    void projects.refetch();
    void agents.refetch();
    void sessions.refetch();
  }

  const listTop = (
    <>
      <ConnectionBanner />
      {listUpdates.status === 'error' && connection === 'open' && (
        <LoadError
          title="Live updates stopped"
          description="The Sessions shown may be out of date."
          onRetry={listUpdates.reset}
        />
      )}
      <Text className="h-8 pl-gutter pr-3 py-2 wide:pl-4.5 text-xs leading-4 font-medium text-muted-foreground">
        Projects
      </Text>
    </>
  );

  let sessionContent: ReactNode;
  if (error && !loading) {
    sessionContent = (
      <BelowHeader>
        {!wide && listTop}
        <LoadError
          title="Couldn't load Sessions"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={retry}
        />
      </BelowHeader>
    );
  } else if (loading) {
    sessionContent = (
      <BelowHeader>
        {!wide && listTop}
        <SessionsLoading />
      </BelowHeader>
    );
  } else {
    sessionContent = (
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
        // On a phone the rows scroll under the header, so what sits above them scrolls too.
        header={
          wide ? undefined : (
            <View className="-mx-gutter-list -mt-5">{listTop}</View>
          )
        }
      />
    );
  }
  let newSessionControl: ReactNode;
  if (wide) {
    newSessionControl = (
      <View className="h-16 justify-center px-3">
        <Button
          accessibilityLabel="New Session"
          onPress={() => navigate({ to: 'new-session' })}
          className="h-9 sm:h-9 self-start flex-row gap-2 rounded-md px-3"
        >
          <Icon as={NotePencilIcon} className="text-primary-foreground" />
          <Text className="text-sm text-primary-foreground">New Session</Text>
        </Button>
      </View>
    );
  } else if (newSessionInHeader) {
    newSessionControl = null;
  } else {
    newSessionControl = (
      <View className="absolute bottom-6 right-4">
        <FloatingActionButton
          accessibilityLabel="New Session"
          icon={NotePencilIcon}
          onPress={() => navigate({ to: 'new-session' })}
        />
      </View>
    );
  }
  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-background wide:bg-sidebar"
      style={{ minHeight: 0 }}
    >
      {wide && listTop}
      {sessionContent}
      {sessions.isFetchNextPageError && (
        <LoadError
          title="Couldn't load more Sessions"
          description="Try loading the next page again."
          onRetry={() => {
            void sessions.fetchNextPage();
          }}
        />
      )}
      {newSessionControl}
    </Screen>
  );
}

// Keeps content that doesn't scroll out from under a transparent header.
function BelowHeader({ children }: { children: ReactNode }) {
  const wide = useWide();
  if (!hasLiquidGlass || wide) return <>{children}</>;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, minHeight: 0 }}>
      {children}
    </SafeAreaView>
  );
}

// Live list updates refetch its pages and resume after Connection recovery.
function useSessionListUpdates() {
  const trpc = useTRPC();
  const refetch = useCoalescedListRefetch();
  const subscription = useSubscription(
    trpc.session.listUpdates.subscriptionOptions(undefined, {
      onStarted: refetch,
      onData: refetch,
    }),
  );
  useResubscribeOnReconnect(subscription);
  return subscription;
}

function useCoalescedListRefetch() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const trailing = useRef(false);
  return useCallback(() => {
    if (inFlight.current) {
      trailing.current = true;
      return;
    }
    const refetch = async () => {
      inFlight.current = true;
      try {
        do {
          trailing.current = false;
          await queryClient.invalidateQueries(trpc.session.list.pathFilter(), {
            cancelRefetch: false,
          });
        } while (trailing.current);
      } finally {
        inFlight.current = false;
      }
    };
    void refetch();
  }, [queryClient, trpc]);
}
