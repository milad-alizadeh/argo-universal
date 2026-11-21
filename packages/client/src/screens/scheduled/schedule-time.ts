export const secondsPerMinute = 60;

export const secondsPerHour = 60 * secondsPerMinute;

export const occurrenceTime = (time: number): string =>
  new Date(time).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const longUnit = (unit: string): Intl.NumberFormat =>
  new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit,
    unitDisplay: 'long',
  });

const hours = longUnit('hour');

const minutes = longUnit('minute');

const seconds = longUnit('second');

export function intervalLabel(value: number): string {
  if (value % secondsPerHour === 0)
    return `Every ${hours.format(value / secondsPerHour)}`;

  if (value % secondsPerMinute === 0)
    return `Every ${minutes.format(value / secondsPerMinute)}`;

  return `Every ${seconds.format(value)}`;
}

const day = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const clock = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export function upcomingOccurrence(at: number, now = new Date()): string {
  const next = new Date(at);

  return next.toDateString() === now.toDateString()
    ? `Today ${clock.format(next)}`
    : day.format(next);
}
