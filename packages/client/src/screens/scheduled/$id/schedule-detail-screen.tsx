import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import { SessionDetailScreen } from '../../sessions/$id/session-detail-screen';
import { scheduleHref } from '../schedule-href';
import { useSchedules } from '../scheduled-list-screen';
import {
  ScheduleDetailView,
  type ScheduleDetailViewProps,
} from './schedule-detail-view';

function detailStatus(
  schedules: ReturnType<typeof useSchedules>,
): ScheduleDetailViewProps['status'] {
  if (schedules.isError) return 'failed';

  if (schedules.isPending) return 'loading';

  return undefined;
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

  return (
    <ScheduleDetailView
      schedule={schedule}
      status={detailStatus(schedules)}
      running={run.isPending}
      error={
        run.error?.message ??
        (run.data?.outcome === 'started' ? undefined : run.data?.reason)
      }
      onRunNow={() => {
        if (schedule) run.mutate({ id, projectId: schedule.projectId });
      }}
    />
  );
}
