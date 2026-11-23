import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import { useProjectSchedules } from '#features/project-schedules';
import { SessionDetailScreen } from '../../sessions/$id/session-detail-screen';

export function ScheduledDetailScreen({
  id,
  childId,
}: {
  id: string;
  childId?: string;
}): ReactNode {
  const schedules = useProjectSchedules();
  const schedule = schedules.data?.find((row) => row.id === id);

  if (schedule)
    return <SessionDetailScreen id={childId ?? schedule.sessionId} />;

  return (
    <Screen title="Schedule">
      <EmptyState
        title={
          schedules.isPending ? 'Loading Schedule' : 'Could not load Schedule'
        }
      />
    </Screen>
  );
}
