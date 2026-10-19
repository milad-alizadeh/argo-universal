import type { SessionInfo } from '@repo/contracts';
import { formatAge } from '#lib/generic/format-elapsed';
import type { SessionsOrder } from '../../stores/sessions-view';

// Each order's time, which a row's age counts from, so the ages shown run in the list's order.
const ageTimes = {
  activity: (session: SessionInfo): number => session.activityAt,
  created: (session: SessionInfo): number => session.createdAt,
} satisfies Record<SessionsOrder, (session: SessionInfo) => number>;

// How long ago a Session was active, or was created in the Created order.
export function sessionAge(
  session: SessionInfo,
  ageFrom: number,
  order: SessionsOrder,
): string {
  return formatAge(ageFrom - ageTimes[order](session));
}
