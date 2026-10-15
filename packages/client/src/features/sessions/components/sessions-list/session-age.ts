import type { SessionInfo } from '@repo/contracts';
import { formatAge } from '#lib/generic/format-elapsed';
import { useClock } from '#lib/generic/use-clock';

// While rows show their ages, the clock ticks so each age stays current; memoised rows redraw only when their text changes.
export function useAgeFrom(flat: boolean): number | undefined {
  const clock = useClock(flat);

  return flat ? clock : undefined;
}

// How long ago a Session was active, when the list shows ages.
export function sessionAge(
  session: SessionInfo,
  ageFrom: number | undefined,
): string | undefined {
  return ageFrom === undefined
    ? undefined
    : formatAge(ageFrom - session.activityAt);
}
