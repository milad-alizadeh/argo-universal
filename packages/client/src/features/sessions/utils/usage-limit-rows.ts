import type { UsageLimit } from '@repo/contracts';
import type { ComposerProps } from '#features/composer';

type UsageLimitRow = NonNullable<
  NonNullable<ComposerProps['status']>['usage']
>['limits'][number];

type Measure = UsageLimit['measure'];

const aMinute = 60_000;

const minutesInHour = 60;

const hoursInDay = 24;

const fullPercent = 100;

const windowOrder: Record<NonNullable<UsageLimit['window']>, number> = {
  five_hour: 0,
  day: 1,
  week: 2,
  month: 3,
  other: 4,
};

const windowRank = (limit: UsageLimit): number =>
  windowOrder[limit.window ?? 'other'];

const modelRank = (limit: UsageLimit): number => (limit.model ? 1 : 0);

// The shortest window first, as the Usage control's trigger shows the first; a limit on one model after the plan's own.
const byWindow = (left: UsageLimit, right: UsageLimit): number =>
  windowRank(left) - windowRank(right) || modelRank(left) - modelRank(right);

const fractionShare = (measure: Measure): number | undefined =>
  measure.kind === 'fraction' ? measure.used : undefined;

const budgetShare = (measure: Measure): number | undefined =>
  measure.kind === 'budget' && measure.entitled > 0
    ? measure.used / measure.entitled
    : undefined;

// The used share, when the Agent reported one a percentage may be drawn for.
const usedShare = (measure: Measure): number | undefined =>
  fractionShare(measure) ?? budgetShare(measure);

const percentOf = (share: number): number =>
  Math.min(fullPercent, Math.max(0, Math.round(share * fullPercent)));

// "2h 14m", or "2h" on the hour.
const twoUnits = (
  [big, bigUnit]: [number, string],
  [small, smallUnit]: [number, string],
): string =>
  small > 0 ? `${big}${bigUnit} ${small}${smallUnit}` : `${big}${bigUnit}`;

const hoursText = (minutes: number): string => {
  const hours = Math.floor(minutes / minutesInHour);

  return hours < hoursInDay
    ? twoUnits([hours, 'h'], [minutes % minutesInHour, 'm'])
    : twoUnits(
        [Math.floor(hours / hoursInDay), 'd'],
        [hours % hoursInDay, 'h'],
      );
};

const durationText = (minutes: number): string =>
  minutes < minutesInHour ? `${minutes}m` : hoursText(minutes);

// "Resets in 2h 14m": days and hours from a day, hours and minutes from an hour, minutes below.
const resetsText = (minutes: number): string =>
  minutes < 1
    ? 'Resets in less than a minute'
    : `Resets in ${durationText(minutes)}`;

// Milliseconds until the limit resets; none when it gave no reset or it has passed.
function untilReset(limit: UsageLimit, now: Date): number | undefined {
  const left = Date.parse(limit.resetsAt ?? '') - now.getTime();

  return left > 0 ? left : undefined;
}

function usageLimitRow(
  limit: UsageLimit,
  now: Date,
): UsageLimitRow | undefined {
  const share = usedShare(limit.measure);
  const left = untilReset(limit, now);

  if (share === undefined || left === undefined) return undefined;

  return {
    label: limit.label,
    usedPercent: percentOf(share),
    resets: resetsText(Math.floor(left / aMinute)),
  };
}

// The Usage control's rows: only limits with a percentage and a reset still ahead; the others wait for a design.
export function usageLimitRows(
  limits: readonly UsageLimit[],
  now: Date,
): UsageLimitRow[] {
  return [...limits]
    .sort(byWindow)
    .map((limit) => usageLimitRow(limit, now))
    .filter((row) => row !== undefined);
}
