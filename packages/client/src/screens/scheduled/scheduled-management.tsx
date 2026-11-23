import type { ProjectSchedule } from '@repo/contracts/operations';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useState } from 'react';
import {
  useManageProjectSchedule,
  useRunProjectSchedule,
} from '#features/project-schedules';
import type { ScheduleRowAction } from './scheduled-list-view';

type ScheduleOverlay =
  | { type: 'create' }
  | { type: 'edit' | 'delete'; schedule: ProjectSchedule };

type ScheduleManagement = {
  overlay: ScheduleOverlay | undefined;
  onCreate: () => void;
  onAction: (schedule: ProjectSchedule, action: ScheduleRowAction) => void;
  onDelete: (schedule: ProjectSchedule) => void;
  onClose: () => void;
  saving: boolean;
};

export function useScheduleManagement(
  onDeleted?: (schedule: ProjectSchedule) => void,
): ScheduleManagement {
  const [overlay, setOverlay] = useState<ScheduleOverlay>();

  const run = useRunSchedule();

  const mutation = useManageProjectSchedule(() => {
    setOverlay(undefined);

    if (overlay?.type === 'delete') onDeleted?.(overlay.schedule);
  });

  useErrorToast(
    (mutation.error && {
      title: 'Could not update Schedule',
      message: mutation.error.message,
    }) ||
      undefined,
  );

  return {
    overlay,
    onCreate: (): void => setOverlay({ type: 'create' }),
    onAction: (schedule, action): void => {
      if (action === 'run') {
        run.mutate({ id: schedule.id, projectId: schedule.projectId });

        return;
      }

      if (action === 'pause' || action === 'resume') {
        mutation.mutate({
          id: schedule.id,
          projectId: schedule.projectId,
          action,
        });
      } else {
        setOverlay({ type: action, schedule });
      }
    },
    onDelete: (schedule): void =>
      mutation.mutate({
        id: schedule.id,
        projectId: schedule.projectId,
        action: 'delete',
      }),
    onClose: (): void => setOverlay(undefined),
    saving: mutation.isPending,
  };
}

function useRunSchedule(): ReturnType<typeof useRunProjectSchedule> {
  const run = useRunProjectSchedule(() => {});

  useErrorToast(
    run.error
      ? {
          title: 'Could not run Schedule',
          message: run.error.message,
        }
      : undefined,
  );

  return run;
}
