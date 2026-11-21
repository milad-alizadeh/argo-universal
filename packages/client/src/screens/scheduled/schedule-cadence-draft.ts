import {
  type ProjectScheduleCadence,
  type ScheduleWeekday,
} from '@repo/contracts/operations';
import { secondsPerHour, secondsPerMinute } from './schedule-time';

const intervalSeconds = {
  second: 1,
  minute: secondsPerMinute,
  hour: secondsPerHour,
} as const;

type IntervalUnit = keyof typeof intervalSeconds;

type CalendarUnit = 'day' | 'week';

export type ScheduleCadenceDraft = {
  repeat: ProjectScheduleCadence['type'];
  interval: string;
  intervalUnit: IntervalUnit;
  every: string;
  unit: CalendarUnit;
  weekdays: ScheduleWeekday[];
  localTime: string;
  timeZone: string;
};

const defaultClock = '09:00';

const deviceTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function intervalUnitOf(seconds: number): IntervalUnit {
  if (seconds % secondsPerHour === 0) return 'hour';

  return seconds % secondsPerMinute === 0 ? 'minute' : 'second';
}

function intervalDraft(seconds: number): Partial<ScheduleCadenceDraft> {
  const unit = intervalUnitOf(seconds);

  return {
    interval: String(seconds / intervalSeconds[unit]),
    intervalUnit: unit,
  };
}

function calendarDraft(
  rule: Exclude<ProjectScheduleCadence, { type: 'interval' }>,
): Partial<ScheduleCadenceDraft> {
  const base = { localTime: rule.localTime, timeZone: rule.timeZone };

  if (rule.type === 'weekly') return { ...base, weekdays: rule.weekdays };

  if (rule.type === 'custom') {
    return {
      ...base,
      every: String(rule.every),
      unit: rule.unit,
      weekdays: rule.weekdays ?? ['monday'],
    };
  }

  return base;
}

export function scheduleCadenceDraft(
  rule?: ProjectScheduleCadence,
): ScheduleCadenceDraft {
  const draft: ScheduleCadenceDraft = {
    repeat: rule?.type ?? 'weekdays',
    interval: '1',
    intervalUnit: 'hour',
    every: '1',
    unit: 'week',
    weekdays: ['monday'],
    localTime: defaultClock,
    timeZone: deviceTimeZone(),
  };

  if (!rule) return draft;

  const fields =
    rule.type === 'interval'
      ? intervalDraft(rule.intervalSeconds)
      : calendarDraft(rule);

  return { ...draft, ...fields };
}

export function cadenceOf(draft: ScheduleCadenceDraft): ProjectScheduleCadence {
  const type = draft.repeat;
  const { localTime, timeZone, weekdays, unit } = draft;

  if (type === 'interval') {
    return {
      type,
      intervalSeconds:
        Number(draft.interval) * intervalSeconds[draft.intervalUnit],
    };
  }

  if (type === 'weekly') return { type, weekdays, localTime, timeZone };

  if (type === 'custom') {
    return {
      type,
      every: Number(draft.every),
      unit,
      weekdays: unit === 'week' ? weekdays : undefined,
      localTime,
      timeZone,
    };
  }

  return { type, localTime, timeZone };
}
