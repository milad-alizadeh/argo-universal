const minute = 60;

const hour = 3600;

// The waits Settings offers before a silent call ends, in minutes; five is the Server's default.
const defaultMinutes = 5;

const halfHourMinutes = 30;

const usualMinutes = [1, 2, defaultMinutes, 10, halfHourMinutes, 60];

const usualWaits = usualMinutes.map((count) => count * minute);

const counted = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

// A wait in the largest unit it fills whole: "30 seconds", "5 minutes", "1 hour".
export function idleLabel(seconds: number): string {
  if (seconds % hour === 0) return counted(seconds / hour, 'hour');

  return seconds % minute === 0
    ? counted(seconds / minute, 'minute')
    : counted(seconds, 'second');
}

export interface IdleChoice {
  value: string;
  label: string;
}

// The usual waits, with one set elsewhere, such as by an Agent, kept in its place among them.
export function idleChoices(current: number): IdleChoice[] {
  const waits = usualWaits.includes(current)
    ? usualWaits
    : [...usualWaits, current].sort((a, b) => a - b);

  return waits.map((wait) => ({ value: String(wait), label: idleLabel(wait) }));
}

export const percentLabel = (percent: number): string => `${percent}%`;
