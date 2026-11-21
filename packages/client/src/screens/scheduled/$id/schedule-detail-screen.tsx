import type { ReactNode } from 'react';
import {
  useProjectSchedules,
  useRunProjectSchedule,
} from '#features/project-schedules';
import { useNavigate } from '#lib/product/navigation/navigation';
import { SessionDetailScreen } from '../../sessions/$id/session-detail-screen';
import { scheduleHref } from '../schedule-href';
import {
  ScheduleDetailView,
  type ScheduleDetailViewProps,
} from './schedule-detail-view';

function detailStatus(
  schedules: ReturnType<typeof useProjectSchedules>,
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
  const navigate = useNavigate();
  const schedules = useProjectSchedules();
  const schedule = schedules.data?.find((row) => row.id === id);

  const run = useRunProjectSchedule((sessionId) => {
    navigate(scheduleHref({ id, latestSessionId: sessionId }), {
      replace: true,
    });
  });

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
