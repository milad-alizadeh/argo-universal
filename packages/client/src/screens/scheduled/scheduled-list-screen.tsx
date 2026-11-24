import type { SessionListOutput } from '@repo/contracts';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { type ClientError, useTRPC, useTRPCClient } from '#features/connection';
import { useProjectSchedules } from '#features/project-schedules';
import { useSessionListUpdates } from '#features/sessions';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { ScheduleDialog } from './schedule-dialog';
import type { ScheduleContext } from './schedule-form-screen';
import { scheduleHref } from './schedule-href';
import {
  ScheduledListView,
  type ScheduledListViewProps,
} from './scheduled-list-view';
import { useScheduleManagement } from './scheduled-management';

export function useScheduleContext(
  sessionId?: string,
): ScheduleContext | undefined {
  const { id: serverId } = useServerScope();
  const snapshots = useTRPC().session.get;

  const { data } = useQuery(
    snapshots.queryOptions(
      { sessionId: sessionId ?? '' },
      { enabled: Boolean(sessionId) },
    ),
  );

  const [context, setContext] = useState<
    ScheduleContext & { serverId: string }
  >();

  const projectId = data?.projectId;
  const agent = data?.agent;

  if (
    projectId &&
    agent &&
    (context?.projectId !== projectId ||
      context.agent !== agent ||
      context.serverId !== serverId)
  ) {
    setContext({ projectId, agent, serverId });
  }

  return context?.serverId === serverId ? context : undefined;
}

export function ScheduledListScreen({
  selectedId,
  context,
}: {
  selectedId?: string;
  context?: ScheduleContext;
}): ReactElement {
  const path = usePathname();
  const enabled = path === '/scheduled' || path.startsWith('/scheduled/');
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const schedules = useProjectSchedules(enabled);
  const agents = loadedAgents(useInstalledAgents());

  const started = useStartedSessions(
    enabled && Boolean(schedules.data?.length),
  );

  const navigation = useScheduledNavigation();
  const selected = schedules.data?.find(({ id }) => id === selectedId);

  const management = useScheduleManagement((schedule) => {
    if (schedule.id === selectedId)
      navigation.onDeleteSelected(childId ?? schedule.sessionId);
  });

  return (
    <>
      <ScheduledListView
        schedules={schedules.data ?? []}
        selectedId={childId ? undefined : selectedId}
        selectedChildId={childId}
        startedSessions={started.data?.pages.flatMap(
          ({ sessions }) => sessions,
        )}
        agents={agents}
        onOpenStarted={navigation.onOpenStarted}
        onEndReached={() => {
          if (started.hasNextPage && !started.isFetchingNextPage)
            void started.fetchNextPage();
        }}
        status={listStatus(schedules)}
        onCreate={management.onCreate}
        onAction={management.onAction}
        onOpen={navigation.onOpen}
      />
      <ScheduleDialog context={selected ?? context} management={management} />
    </>
  );
}

type ScheduledNavigation = Pick<
  ScheduledListViewProps,
  'onOpen' | 'onOpenStarted'
> & {
  onDeleteSelected: (sessionId: string) => void;
};

function useScheduledNavigation(): ScheduledNavigation {
  const navigate = useNavigate();
  const client = useTRPCClient();

  return {
    onDeleteSelected: (sessionId) =>
      navigate(sessionHref(sessionId), { replace: true }),
    onOpen: (schedule) => navigate(scheduleHref(schedule)),
    onOpenStarted: (schedule, sessionId) => {
      navigate({
        pathname: '/scheduled/[id]',
        params: { id: schedule.id, childId: sessionId },
      });
      void client.session.open.mutate({ sessionId }).catch(() => {});
    },
  };
}

type StartedSessions = UseInfiniteQueryResult<
  InfiniteData<SessionListOutput, string | null>,
  ClientError
>;

function useStartedSessions(enabled: boolean): StartedSessions {
  const list = useTRPC().session.list;

  const started = useInfiniteQuery(
    list.infiniteQueryOptions(
      { taskSessions: 'started' },
      {
        enabled,
        getNextPageParam: (page) => page.nextCursor ?? undefined,
      },
    ),
  );

  // Live updates start once the list holds rows, from the Device or the Server, for them to land on.
  useSessionListUpdates(enabled && !started.isPending);

  return started;
}

function listStatus(
  schedules: ReturnType<typeof useProjectSchedules>,
): Parameters<typeof ScheduledListView>[0]['status'] {
  if (schedules.isError) return 'failed';

  if (schedules.isPending) return 'loading';

  return undefined;
}
