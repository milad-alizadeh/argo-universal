import type { SessionInfo } from '@repo/contracts';
import { formatAge } from '#lib/generic/format-elapsed';

// How long ago a Session was last active; the list sorts by the same time, so the ages run in its order.
export function sessionAge(session: SessionInfo, ageFrom: number): string {
  return formatAge(ageFrom - session.activityAt);
}
