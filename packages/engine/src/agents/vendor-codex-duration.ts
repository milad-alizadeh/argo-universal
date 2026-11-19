import type { UsageLimit } from '@repo/contracts';

export type Window = NonNullable<UsageLimit['window']>;

const minutesPerHour = 60;

const hoursPerDay = 24;

const daysPerWeek = 7;

const minutesPerDay = hoursPerDay * minutesPerHour;

const hoursPerSession = 5;

const februaryDays = 28;

const leapFebruaryDays = 29;

const shortMonthDays = 30;

const longMonthDays = 31;

const calendarMonthDays = [
  februaryDays,
  leapFebruaryDays,
  shortMonthDays,
  longMonthDays,
];

const monthly: [Window, string] = ['month', 'Monthly limit'];

const standardWindows = new Map<number, [Window, string]>([
  [hoursPerSession * minutesPerHour, ['five_hour', '5-hour limit']],
  [minutesPerDay, ['day', 'Daily limit']],
  [daysPerWeek * minutesPerDay, ['week', 'Weekly limit']],
  ...calendarMonthDays.map((days): [number, [Window, string]] => [
    days * minutesPerDay,
    monthly,
  ]),
]);

export function duration(minutes: number | null | undefined): [Window, string] {
  if (!minutes) return ['other', 'Usage limit'];

  return standardWindows.get(minutes) ?? ['other', `${minutes}-minute limit`];
}
