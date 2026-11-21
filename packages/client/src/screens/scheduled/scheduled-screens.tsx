import type { ProjectSchedule } from '@repo/contracts/operations';
import {
  Dialog,
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useState, type ReactElement, type ReactNode } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { SessionDetailScreen } from '../sessions/$id/session-detail-screen';
import { ScheduleDetailView } from './schedule-detail-view';
import { ScheduleFormView } from './schedule-form-view';
import { scheduleHref } from './schedule-href';
import { ScheduledListView } from './scheduled-list-view';

type ScheduleContext = { projectId: string; agent: string };

const schedulesInput = {};

const scheduleRefreshMs = 5000;

type ScheduleQuery = Pick<
  UseQueryResult<ProjectSchedule[]>,
  'data' | 'isError' | 'isPending'
>;

function useSchedules(enabled = true): ScheduleQuery {
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

  const schedules = useSchedules(
    path === '/scheduled' || path.startsWith('/scheduled/'),
  );

  const navigate = useNavigate();
  const selected = schedules.data?.find(({ id }) => id === selectedId);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <ScheduledListView
        schedules={schedules.data ?? []}
        selectedId={selectedId}
        status={listStatus(schedules)}

        onCreate={() => setCreating(true)}
        onOpen={(schedule) => navigate(scheduleHref(schedule))}
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        {creating && (
          <ScheduleFormScreen
            context={selected ?? context}
            onClose={() => setCreating(false)}
          />
        )}
      </Dialog>
    </>
  );
}

function listStatus(
  schedules: ScheduleQuery,
): Parameters<typeof ScheduledListView>[0]['status'] {
  if (schedules.isError) return 'failed';

  if (schedules.isPending) return 'loading';

  return undefined;
}

function ScheduleFormScreen({
  context,
  onClose,
}: {
  context?: ScheduleContext;
  onClose: () => void;
}): ReactElement {
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions());
  const agents = useInstalledAgents();

  const available =
    projects.data?.filter((project) => project.folderExists) ?? [];

  const initialProjectId =
    available.find((project) => project.id === context?.projectId)?.id ??
    (available.length === 1 ? (available[0]?.id ?? '') : '');

  if (projects.isError || agents.status === 'failed') {
    return <FormStatus description="Could not load Projects and Agents." />;
  }

  if (projects.isPending || agents.status === 'loading') {
    return <FormStatus description="Loading Projects and Agents…" />;
  }

  return (
    <ConnectedScheduleForm
      initialProjectId={initialProjectId}
      initialAgent={context?.agent}
      onClose={onClose}
      projects={available.map(({ id, name }) => ({ value: id, label: name }))}
      agents={loadedAgents(agents).map(({ id, name }) => ({
        value: id,
        label: name,
      }))}
    />
  );
}

function FormStatus({ description }: { description: string }): ReactElement {
  return (
    <DialogForm
      title="New Schedule"
      description={description}
      footer={
        <DialogFooter>
          <DialogCancel label="Cancel" />
        </DialogFooter>
      }
    >
      {null}
    </DialogForm>
  );
}

type ScheduleChoices = Pick<
  Parameters<typeof ScheduleFormView>[0],
  'initialProjectId' | 'initialAgent' | 'projects' | 'agents'
> & { onClose: () => void };

function ConnectedScheduleForm({
  initialProjectId,
  initialAgent,
  projects,
  agents,
  onClose,
}: ScheduleChoices): ReactElement {
  const trpc = useTRPC();
  const [projectId, setProjectId] = useState(initialProjectId);

  const branches = useQuery(
    trpc.project.listBranches.queryOptions(
      { projectId },
      { enabled: Boolean(projectId) },
    ),
  );

  const save = useSaveSchedule(onClose);

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
      {...save}
    />
  );
}

function useSaveSchedule(
  onClose: () => void,
): Pick<
  Parameters<typeof ScheduleFormView>[0],
  'onSubmit' | 'saving' | 'error'
> {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();

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
        onClose();
        navigate(scheduleHref(schedule));
      },
    }),
  );

  return {
    onSubmit: (input) => saved.mutate(input),
    saving: saved.isPending,
    error: saved.error?.message,
  };
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
        (run.data?.outcome === 'started' ? undefined : run.data?.reason)
      }
      onRunNow={() => run.mutate({ id, projectId: schedule.projectId })}
    />
  );
}
