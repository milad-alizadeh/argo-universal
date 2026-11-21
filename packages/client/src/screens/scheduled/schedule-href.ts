import type { ProjectSchedule } from '@repo/contracts/operations';
import type { Href } from 'expo-router';

export function scheduleHref({
  id,
  latestSessionId,
}: Pick<ProjectSchedule, 'id' | 'latestSessionId'>): Href {
  return {
    pathname: '/scheduled/[id]',
    params: latestSessionId
      ? { id, sessionId: latestSessionId }
      : { id, sessionId: '' },
  };
}
