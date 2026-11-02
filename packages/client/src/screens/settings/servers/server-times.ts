import type { AppServerState, ServerHistory } from '#features/servers';

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

export const unknownTime = 'Unknown';

export interface ServerTimes {
  lastConnected?: string;
  paired?: string;
}

const said = (
  at: number | undefined,
  say: (at: number, now: number) => string,
): string => (at === undefined ? unknownTime : say(at, Date.now()));

/*
 * The own Server is never paired with, so it has neither, and nothing is said while the history is being read. A
 * Server paired before times were kept says Unknown rather than hiding the row; one that is connected is reached now.
 */
export function serverTimes(
  own: boolean,
  history: ServerHistory | undefined,
  state: AppServerState,
): ServerTimes {
  if (own || !history) return {};

  return {
    lastConnected: lastReached(history, state),
    paired: said(history.pairedAt, dateLabel),
  };
}

const lastReached = (history: ServerHistory, state: AppServerState): string =>
  state === 'connected' ? 'Now' : said(history.lastConnectedAt, whenLabel);
