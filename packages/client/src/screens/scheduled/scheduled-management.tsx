import type { ProjectSchedule } from '@repo/contracts/operations';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { useTRPC } from '#features/connection';
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

const scheduleRefreshMs = 5000;

export const schedulesInput = {};

export function useScheduleManagement(): ScheduleManagement {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const [overlay, setOverlay] = useState<ScheduleOverlay>();

  const mutation = useMutation(
    trpc.project.scheduleManage.mutationOptions({
      onSuccess: (_result, input) => {
        if (input.action === 'delete') setOverlay(undefined);
        updateScheduleList(cache, trpc, input);
      },
    }),
  );

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

type ScheduleChange = {
  id: string;
  action: 'pause' | 'resume' | 'delete';
};

function updateScheduleList(
  cache: ReturnType<typeof useQueryClient>,
  trpc: ReturnType<typeof useTRPC>,
  { id, action }: ScheduleChange,
): void {
  cache.setQueryData(
    trpc.project.scheduleList.queryKey(schedulesInput),
    (current) => {
      if (!current) return current;

      if (action === 'delete') return current.filter((row) => row.id !== id);

      return current.map((row) =>
        row.id === id ? { ...row, paused: action === 'pause' } : row,
      );
    },
  );
  void cache.invalidateQueries({
    queryKey: trpc.project.scheduleList.pathKey(),
  });
}

export function ConnectedScheduleHistory({
  schedule,
  onOpenSession,
}: {
  schedule: ProjectSchedule;
  onOpenSession: (sessionId: string) => void;
}): ReactElement {
  const trpc = useTRPC();

  const history = useInfiniteQuery(
    trpc.project.scheduleHistory.infiniteQueryOptions(
      { id: schedule.id, projectId: schedule.projectId },
      {
        getNextPageParam: (page) => page.next ?? undefined,
        refetchInterval: scheduleRefreshMs,
      },
    ),
  );

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
