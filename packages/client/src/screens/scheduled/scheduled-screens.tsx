import type {
  ProjectSchedule,
  ProjectScheduleInput,
} from '@repo/contracts/operations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname, type Href } from 'expo-router';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { SessionDetailScreen } from '../sessions/$id/session-detail-screen';
import { ScheduleDetailView } from './schedule-detail-view';
import { ScheduleFormView } from './schedule-form-view';
import { ScheduledListView } from './scheduled-list-view';

type ScheduleContext = { projectId: string; agent: string };
const schedulesInput = {};
const scheduleRefreshMs = 5000;

function useSchedules(enabled = true) {
  return useQuery(
    useTRPC().project.scheduleList.queryOptions(schedulesInput, {
      enabled,
      refetchInterval: enabled ? scheduleRefreshMs : false,
    }),
  );
}

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

  useEffect(() => {
    if (projectId && agent) setContext({ projectId, agent, serverId });
  }, [projectId, agent, serverId]);

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
  const schedules = useSchedules(
    path === '/scheduled' || path.startsWith('/scheduled/'),
  );
  const navigate = useNavigate();
  const selected = schedules.data?.find(({ id }) => id === selectedId);
  const from = selected ?? context;

  return (
    <ScheduledListView
      schedules={schedules.data ?? []}
      selectedId={selectedId}
      status={
        schedules.isError
          ? 'failed'
          : schedules.isPending
            ? 'loading'
            : undefined
      }
      onCreate={() =>
        navigate({
          pathname: '/scheduled/new',
          params: from ? { projectId: from.projectId, agent: from.agent } : {},
        })
      }
      onOpen={(schedule) => navigate(scheduleHref(schedule))}
    />
  );
}

export function scheduleHref({
  id,
  latestSessionId,
}: Pick<ProjectSchedule, 'id' | 'latestSessionId'>): Href {
  return {
    pathname: '/scheduled/[id]',
    params: latestSessionId
      ? { id, sessionId: latestSessionId }
      : { id, sessionId: '' },
  };
}

export function ScheduleFormScreen(): ReactNode {
  const context = useLocalSearchParams<{
    projectId?: string;
    agent?: string;
  }>();
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions());
  const agents = useInstalledAgents();
  const available =
    projects.data?.filter((project) => project.folderExists) ?? [];
  const initialProjectId =
    available.find((project) => project.id === context.projectId)?.id ??
    (available.length === 1 ? (available[0]?.id ?? '') : '');

  if (projects.isPending || agents.status === 'loading') return null;

  return (
    <ConnectedScheduleForm
      initialProjectId={initialProjectId}
      initialAgent={context.agent}
      projects={available.map(({ id, name }) => ({ value: id, label: name }))}
      agents={loadedAgents(agents).map(({ id, name }) => ({
        value: id,
        label: name,
      }))}
    />
  );
}

type ScheduleChoices = Pick<
  Parameters<typeof ScheduleFormView>[0],
  'initialProjectId' | 'initialAgent' | 'projects' | 'agents'
>;

function ConnectedScheduleForm({
  initialProjectId,
  initialAgent,
  projects,
  agents,
}: ScheduleChoices): ReactElement {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(initialProjectId);
  const branches = useQuery(
    trpc.project.listBranches.queryOptions(
      { projectId },
      { enabled: Boolean(projectId) },
    ),
  );
  const saved = useMutation(
    trpc.project.scheduleCreate.mutationOptions({
      onSuccess: (schedule) => {
        cache.setQueryData(
          trpc.project.scheduleList.queryKey(schedulesInput),
          (current) => [
            ...(current ?? []).filter((row) => row.id !== schedule.id),
            schedule,
          ],
        );
        void cache.invalidateQueries({
          queryKey: trpc.project.scheduleList.pathKey(),
        });
        navigate(scheduleHref(schedule), { replace: true });
      },
    }),
  );
  const submit = (input: ProjectScheduleInput): void => saved.mutate(input);

  return (
    <ScheduleFormView
      projects={projects}
      agents={agents}
      branches={
        branches.data?.branches.map((branch) => ({
          value: branch,
          label: branch,
        })) ?? []
      }
      currentBranch={branches.data?.currentBranch}
      initialProjectId={initialProjectId}
      initialAgent={
        agents.some(({ value }) => value === initialAgent)
          ? initialAgent
          : undefined
      }
      onProjectChange={setProjectId}
      onSubmit={submit}
      saving={saved.isPending}
      error={saved.error?.message}
    />
  );
}

export function ScheduledDetailScreen({
  id,
  sessionId,
}: {
  id: string;
  sessionId?: string;
}): ReactNode {
  if (sessionId) return <SessionDetailScreen id={sessionId} />;
  return <ConnectedScheduleDetail id={id} />;
}

function ConnectedScheduleDetail({ id }: { id: string }): ReactNode {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const schedules = useSchedules();
  const schedule = schedules.data?.find((row) => row.id === id);
  const run = useMutation(
    trpc.project.scheduleRunNow.mutationOptions({
      onSuccess: (result) => {
        void cache.invalidateQueries({
          queryKey: trpc.project.scheduleList.pathKey(),
        });
        if (result.outcome === 'started') {
          navigate(scheduleHref({ id, latestSessionId: result.sessionId }), {
            replace: true,
          });
        }
      },
    }),
  );
  if (!schedule) return null;

  return (
    <ScheduleDetailView
      schedule={schedule}
      running={run.isPending}
      error={
        run.error?.message ??
        (run.data?.outcome !== 'started' ? run.data?.reason : undefined)
      }
      onRunNow={() => run.mutate({ id, projectId: schedule.projectId })}
    />
  );
}
