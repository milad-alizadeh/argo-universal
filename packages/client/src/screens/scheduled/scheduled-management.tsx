import type { ProjectSchedule } from '@repo/contracts/operations';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useState, type ReactElement } from 'react';
import {
  useManageProjectSchedule,
  useProjectScheduleHistory,
} from '#features/project-schedules';
import { ScheduleHistoryView } from './schedule-history-view';
import type { ScheduleRowAction } from './scheduled-list-view';

type ScheduleOverlay =
  | { type: 'create' }
  | { type: 'edit' | 'history' | 'delete'; schedule: ProjectSchedule };

type ScheduleManagement = {
  overlay: ScheduleOverlay | undefined;
  onCreate: () => void;
  onAction: (schedule: ProjectSchedule, action: ScheduleRowAction) => void;
  onDelete: (schedule: ProjectSchedule) => void;
  onClose: () => void;
  saving: boolean;
};

export function useScheduleManagement(): ScheduleManagement {
  const [overlay, setOverlay] = useState<ScheduleOverlay>();
  const mutation = useManageProjectSchedule(() => setOverlay(undefined));

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

export function ConnectedScheduleHistory({
  schedule,
  onOpenSession,
}: {
  schedule: ProjectSchedule;
  onOpenSession: (sessionId: string) => void;
}): ReactElement {
  const history = useProjectScheduleHistory({
    id: schedule.id,
    projectId: schedule.projectId,
  });

  return (
    <ScheduleHistoryView
      entries={history.data?.pages.flatMap(({ entries }) => entries) ?? []}
      loading={history.isPending || history.isFetchingNextPage}
      error={history.error?.message}
      onOpenSession={onOpenSession}
      onLoadMore={
        history.hasNextPage ? () => void history.fetchNextPage() : undefined
      }
    />
  );
}
