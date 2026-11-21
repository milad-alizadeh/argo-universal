import type { ProjectSchedule } from '@repo/contracts/operations';

interface ScheduledHref {
  pathname: '/scheduled/[id]';
  params: { id: string; sessionId: string };
}

export function scheduleHref({
  id,
  latestSessionId,
}: Pick<ProjectSchedule, 'id' | 'latestSessionId'>): ScheduledHref {
  return {
    pathname: '/scheduled/[id]',
    params: { id, sessionId: latestSessionId ?? '' },
  };
}
