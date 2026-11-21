import {
  ScheduleWeekday,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import { nextIntervalAt } from './schedule-timing';

type CalendarCadence = Exclude<ProjectScheduleCadence, { type: 'interval' }>;

const millisecondsPerMinute = 60_000;

const millisecondsPerHour = 3_600_000;

const millisecondsPerDay = 86_400_000;

const daysPerWeek = 7;

const millisecondsPerWeek = daysPerWeek * millisecondsPerDay;

const daysInWorkweek = 5;

const businessDays = ScheduleWeekday.options.slice(0, daysInWorkweek);

type ZonedClock = (epoch: number) => number;

function clockFor(timeZone: string): ZonedClock {
  const format = new Intl.DateTimeFormat('en', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  return (epoch): number => {
    const values = Object.fromEntries(
      format
        .formatToParts(epoch)
        .map(({ type, value }): [string, number] => [type, Number(value)]),
    );

    return Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
  };
}

function wallDay(clock: ZonedClock, epoch: number): number {
  return Math.floor(clock(epoch) / millisecondsPerDay) * millisecondsPerDay;
}

function wallTimeOffset(time: string): number {
  const [hour, minute] = time.split(':');

  return (
    Number(hour) * millisecondsPerHour + Number(minute) * millisecondsPerMinute
  );
}

function mondayIndex(day: number): number {
  return (new Date(day).getUTCDay() + daysPerWeek - 1) % daysPerWeek;
}

function monday(day: number): number {
  return day - mondayIndex(day) * millisecondsPerDay;
}

function stride(from: number, anchor: number, step: number): number {
  return anchor + Math.ceil((from - anchor) / step) * step;
}

interface WeeklyRule {
  every: number;
  days: readonly ScheduleWeekday[];
}

function nextWeeklyDay(
  from: number,
  anchor: number,
  { every, days }: WeeklyRule,
): number {
  const step = every * millisecondsPerWeek;
  const week = stride(monday(from), monday(anchor), step);
  const choices = days.map(
    (day): number =>
      week + ScheduleWeekday.options.indexOf(day) * millisecondsPerDay,
  );
  const upcoming = choices.filter((day) => day >= from);

  return upcoming.length > 0
    ? Math.min(...upcoming)
    : Math.min(...choices) + step;
}

function nextCalendarDay(
  cadence: CalendarCadence,
  from: number,
  anchor: number,
): number {
  switch (cadence.type) {
    case 'daily':
      return from;
    case 'weekdays':
      return nextWeeklyDay(from, anchor, { every: 1, days: businessDays });
    case 'weekly':
      return nextWeeklyDay(from, anchor, { every: 1, days: cadence.weekdays });
    case 'custom':
      return cadence.unit === 'day'
        ? stride(from, anchor, cadence.every * millisecondsPerDay)
        : nextWeeklyDay(from, anchor, {
            every: cadence.every,
            days: cadence.weekdays ?? [],
          });
  }
}

/*
 * Zone transitions may offer two instants for a local time, or leave a gap.
 * Use the earlier repeated instant and shift a skipped local time by the size of its gap.
 */
function localOccurrence(clock: ZonedClock, wallTime: number): number {
  const samples = [
    wallTime - millisecondsPerDay,
    wallTime,
    wallTime + millisecondsPerDay,
  ];

  const candidates = samples.map((sample) => {
    const at = wallTime + (sample - clock(sample));

    return { at, wall: clock(at) };
  });

  const first = candidates
    .filter(({ wall }) => wall >= wallTime)
    .sort((left, right) => left.wall - right.wall || left.at - right.at)[0];

  if (!first)
    throw new RangeError('Could not resolve the local Schedule time.');

  return first.at;
}

export function nextProjectScheduleAt(
  cadence: ProjectScheduleCadence,
  after: number,
  anchor: number,
): number {
  if (cadence.type === 'interval')
    return nextIntervalAt(anchor, cadence.intervalSeconds, after);

  const clock = clockFor(cadence.timeZone);
  const boundary = Math.max(after, anchor);
  const start = wallDay(clock, anchor);
  const time = wallTimeOffset(cadence.localTime);
  const day = nextCalendarDay(cadence, wallDay(clock, boundary), start);
  const instant = localOccurrence(clock, day + time);

  if (instant > boundary) return instant;

  const nextDay = nextCalendarDay(cadence, day + millisecondsPerDay, start);

  return localOccurrence(clock, nextDay + time);
}
