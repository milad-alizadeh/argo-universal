const dayMs = 86_400_000;

const clock = (at: Date): string =>
  at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const startOfDay = (at: number): number => {
  const date = new Date(at);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

// A day, with the year only when it is not this one.
export function dateLabel(at: number, now: number): string {
  const date = new Date(at);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    ...(!sameYear && { year: 'numeric' }),
  });
}

// Today and Yesterday are said as such with the time, and any other day as a date.
export function whenLabel(at: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(at)) / dayMs);

  if (days === 0) return `Today, ${clock(new Date(at))}`;

  return days === 1 ? `Yesterday, ${clock(new Date(at))}` : dateLabel(at, now);
}
