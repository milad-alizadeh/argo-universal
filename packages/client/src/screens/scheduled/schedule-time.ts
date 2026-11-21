import {
  type ProjectScheduleCadence,
  ScheduleWeekday,
} from '@repo/contracts/operations';

export const secondsPerMinute = 60;

export const secondsPerHour = 60 * secondsPerMinute;

export const occurrenceTime = (time: number, timeZone?: string): string =>
  new Date(time).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });

export const scheduleTimeZone = (
  cadence: ProjectScheduleCadence,
): string | undefined =>
  cadence.type === 'interval' ? undefined : cadence.timeZone;

function units(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

function intervalLabel(value: number): string {
  if (value % secondsPerHour === 0)
    return `Every ${units(value / secondsPerHour, 'hour')}`;

  if (value % secondsPerMinute === 0)
    return `Every ${units(value / secondsPerMinute, 'minute')}`;

  return `Every ${units(value, 'second')}`;
}

type Choice<T extends string> = { value: T; label: string };

type WeekdayChoice = Choice<ScheduleWeekday>;

export const weekdayChoices: WeekdayChoice[] = ScheduleWeekday.options.map(
  (value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }),
);

function pluralWeekdays(selected: readonly ScheduleWeekday[]): string {
  return weekdayChoices
    .flatMap(({ value, label }) =>
      selected.includes(value) ? [`${label}s`] : [],
    )
    .join(', ');
}

function customRepeat(
  cadence: Extract<ProjectScheduleCadence, { type: 'custom' }>,
): string {
  const interval = units(cadence.every, cadence.unit);

  const selected = cadence.weekdays?.length
    ? ` on ${pluralWeekdays(cadence.weekdays)}`
    : '';

  return `Every ${interval}${selected}`;
}

export function cadenceLabel(cadence: ProjectScheduleCadence): string {
  switch (cadence.type) {
    case 'interval':
      return intervalLabel(cadence.intervalSeconds);
    case 'daily':
      return `Daily at ${cadence.localTime}`;
    case 'weekdays':
      return `Weekdays at ${cadence.localTime}`;
    case 'weekly':
      return `${pluralWeekdays(cadence.weekdays)} at ${cadence.localTime}`;
    case 'custom':
      return `${customRepeat(cadence)} at ${cadence.localTime}`;
  }
}

export function upcomingOccurrence(
  at: number,
  timeZone?: string,
  now = Date.now(),
): string {
  const day = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone,
  });

  const calendar = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeZone,
  });

  if (calendar.format(at) !== calendar.format(now)) return day.format(at);

  const clock = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
    timeZone,
  });

  return `Today ${clock.format(at)}`;
}
