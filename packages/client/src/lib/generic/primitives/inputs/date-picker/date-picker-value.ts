import type { DatePickerMode } from './date-picker-props';

// Values are local ISO strings, the formats `<input type="date|time|datetime-local">` reads and writes.
const inputTypes = {
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
} as const satisfies Record<DatePickerMode, string>;

export function inputType(mode: DatePickerMode = 'date'): string {
  return inputTypes[mode];
}

const pad = (part: number): string => String(part).padStart(2, '0');

const datePart = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const timePart = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const isoParts = {
  date: datePart,
  time: timePart,
  datetime: (date: Date): string => `${datePart(date)}T${timePart(date)}`,
} satisfies Record<DatePickerMode, (date: Date) => string>;

export function isoValue(date: Date, mode: DatePickerMode = 'date'): string {
  return isoParts[mode](date);
}

// Missing parts read as NaN, so a malformed value names no date.
const numbers = (
  text: string | undefined,
  separator: string,
): [number, number, number] => {
  const parts = String(text).split(separator);

  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
};

const dayDate = (day: string | undefined): Date => {
  const [year, month, date] = numbers(day, '-');

  return new Date(year, month - 1, date);
};

const withClock = (date: Date, time: string | undefined): Date => {
  const [hours, minutes] = numbers(time, ':');

  date.setHours(hours, minutes, 0, 0);

  return date;
};

// A time alone falls on today.
const readers = {
  date: (value: string): Date => dayDate(value),
  time: (value: string): Date => withClock(new Date(), value),
  datetime: (value: string): Date => {
    const [day, time] = value.split('T');

    return withClock(dayDate(day), time);
  },
} satisfies Record<DatePickerMode, (value: string) => Date>;

// The local Date a value names; a value that does not write back the same (2026-02-30, 25:99) names none.
export function valueDate(
  value: string | undefined,
  mode: DatePickerMode = 'date',
): Date | undefined {
  if (!value) return undefined;

  return sameValue(readers[mode](value), value, mode);
}

function sameValue(
  date: Date,
  value: string,
  mode: DatePickerMode,
): Date | undefined {
  if (Number.isNaN(date.getTime())) return undefined;

  return isoValue(date, mode) === value ? date : undefined;
}

const dayText = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const timeText = (date: Date): string =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const displays = {
  date: dayText,
  time: timeText,
  datetime: (date: Date): string => `${dayText(date)}, ${timeText(date)}`,
} satisfies Record<DatePickerMode, (date: Date) => string>;

// How Android's read-only field shows the value, in the device's locale.
export function displayValue(
  value: string | undefined,
  mode: DatePickerMode = 'date',
): string {
  const date = valueDate(value, mode);

  return date ? displays[mode](date) : '';
}
