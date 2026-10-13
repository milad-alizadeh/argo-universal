const clockTime = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const startTime = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const startDay = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});

// The Server's clock tick as a local wall-clock time, such as "10:00:00".
export function formatServerClock(clock?: string): string {
  return clock ? clockTime.format(new Date(clock)) : '…';
}

/*
 * When the Server started, said relative to its clock: "Today at 09:00" or "3 Oct at 09:00".
 * Before the first tick there is no today to compare with, so the day is named.
 */
export function formatServerStart(startedAt: string, clock?: string): string {
  const started = new Date(startedAt);
  const day = sameLocalDay(started, clock) ? 'Today' : startDay.format(started);

  return `${day} at ${startTime.format(started)}`;
}

function sameLocalDay(started: Date, clock: string | undefined): boolean {
  return started.toDateString() === new Date(clock ?? 0).toDateString();
}
