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
import {
  ConfirmScheduleDelete,
  ConnectedScheduleHistory,
  schedulesInput,
  useScheduleManagement,
} from './scheduled-management';

type ScheduleContext = { projectId: string; agent: string };

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
  const management = useScheduleManagement();

  return (
    <>
      <ScheduledListView
        schedules={schedules.data ?? []}
        selectedId={selectedId}
        status={listStatus(schedules)}
        onCreate={management.onCreate}
        onAction={management.onAction}
        onOpen={(schedule) => navigate(scheduleHref(schedule))}
      />
      <ScheduleDialog context={selected ?? context} management={management} />
    </>
  );
}

type ScheduleDialogProps = {
  context?: ScheduleContext;
  management: ReturnType<typeof useScheduleManagement>;
};

function ScheduleDialog(props: ScheduleDialogProps): ReactElement {
  const { overlay, onClose, saving } = props.management;

  return (
    <Dialog
      open={overlay !== undefined}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <ScheduleDialogContent {...props} />
    </Dialog>
  );
}

function ScheduleDialogContent({
  context,
  management,
}: ScheduleDialogProps): ReactElement | null {
  const navigate = useNavigate();
  const { overlay, onClose, saving, onDelete } = management;

  if (!overlay) return null;

  switch (overlay.type) {
    case 'create':
      return <ScheduleFormScreen context={context} onClose={onClose} />;
    case 'edit':
      return (
        <ScheduleFormScreen
          context={overlay.schedule}
          editing={overlay.schedule}
          onClose={onClose}
        />
      );
    case 'delete':
      return (
        <ConfirmScheduleDelete
          schedule={overlay.schedule}
          saving={saving}
          onDelete={() => onDelete(overlay.schedule)}
        />
      );
    case 'history':
      return (
        <ConnectedScheduleHistory
          schedule={overlay.schedule}
          onOpenSession={(sessionId) => {
            onClose();
            navigate(
              scheduleHref({
                id: overlay.schedule.id,
                latestSessionId: sessionId,
              }),
            );
          }}
        />
      );
  }
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
  editing,
}: {
  context?: ScheduleContext;
  onClose: () => void;
  editing?: ProjectSchedule;
}): ReactElement {
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions());
  const agents = useInstalledAgents();

  const available =
    projects.data?.filter((project) => project.folderExists) ?? [];

  const initialProjectId =
    editing?.projectId ??
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
      editing={editing}
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
  'initialProjectId' | 'initialAgent' | 'projects' | 'agents' | 'editing'
> & { onClose: () => void };

function ConnectedScheduleForm({
  initialProjectId,
  initialAgent,
  projects,
  agents,
  editing,
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

  const save = useSaveSchedule(onClose, editing);

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
      editing={editing}
      {...save}
    />
  );
}

function useSaveSchedule(
  onClose: () => void,
  editing?: ProjectSchedule,
): Pick<
  Parameters<typeof ScheduleFormView>[0],
  'onSubmit' | 'saving' | 'error'
> {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const navigate = useNavigate();

  const remember = (schedule: ProjectSchedule): void => {
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
  };

  const create = useMutation(
    trpc.project.scheduleCreate.mutationOptions({
      onSuccess: (schedule) => {
        remember(schedule);
        navigate(scheduleHref(schedule));
      },
    }),
  );

  const edit = useMutation(
    trpc.project.scheduleEdit.mutationOptions({ onSuccess: remember }),
  );

  if (editing) {
    return {
      onSubmit: (input) => edit.mutate({ ...input, id: editing.id }),
      saving: edit.isPending,
      error: edit.error?.message,
    };
  }

  return {
    onSubmit: (input) => create.mutate(input),
    saving: create.isPending,
    error: create.error?.message,
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
