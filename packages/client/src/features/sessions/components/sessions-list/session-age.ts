import type { SessionInfo } from '@repo/contracts';
import { formatAge } from '#lib/generic/format-elapsed';
import { useClock } from '#lib/generic/use-clock';
import type { SessionsOrder } from '../../stores/sessions-view';

// While rows show their ages, the clock ticks so each age stays current; memoised rows redraw only when their text changes.
export function useAgeFrom(flat: boolean): number | undefined {
  const clock = useClock(flat);

  return flat ? clock : undefined;
}

// Each order's time, which a row's age counts from, so the ages shown run in the list's order.
const ageTimes = {
  activity: (session: SessionInfo): number => session.activityAt,
  created: (session: SessionInfo): number => session.createdAt,
} satisfies Record<SessionsOrder, (session: SessionInfo) => number>;

// How long ago a Session was active, or was created in the Created order, when the list shows ages.
export function sessionAge(
  session: SessionInfo,
  ageFrom: number | undefined,
  order: SessionsOrder,
): string | undefined {
  return ageFrom === undefined
    ? undefined
    : formatAge(ageFrom - ageTimes[order](session));
}
