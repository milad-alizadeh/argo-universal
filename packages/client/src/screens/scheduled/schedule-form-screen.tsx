import type { ProjectSchedule } from '@repo/contracts/operations';
import {
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  useCreateProjectSchedule,
  useEditProjectSchedule,
} from '#features/project-schedules';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ScheduleFormView } from './schedule-form-view';
import { scheduleHref } from './schedule-href';
import { useScheduleTiming } from './use-schedule-timing';

export type ScheduleContext = { projectId: string; agent: string };

export function ScheduleFormScreen({
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
      sheetHeader
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
  const timing = useScheduleTiming(projectId, editing?.cadence, editing?.id);

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
      timing={timing}
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
  const navigate = useNavigate();

  const create = useCreateProjectSchedule((schedule) => {
    onClose();
    navigate(scheduleHref(schedule));
  });

  const edit = useEditProjectSchedule(onClose);

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
