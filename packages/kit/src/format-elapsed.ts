export const millisecondsPerSecond = 1000;

const pad = (value: number): string => String(value).padStart(2, '0');

// A Turn's elapsed time for the live header: "41s", "2m 14s", "1h 02m".
export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / millisecondsPerSecond);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`;

  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

const secondsPerMinute = 60;

const secondsPerHour = 60 * secondsPerMinute;

const secondsPerDay = 24 * secondsPerHour;

const daysPerWeek = 7;

const ageSteps = [
  { unit: 'w', seconds: daysPerWeek * secondsPerDay },
  { unit: 'd', seconds: secondsPerDay },
  { unit: 'h', seconds: secondsPerHour },
  { unit: 'm', seconds: secondsPerMinute },
] as const;

// How long ago something last happened, in its largest whole unit: "now", "2m", "1h", "3d", "5w".
export function formatAge(milliseconds: number): string {
  const seconds = Math.floor(Math.max(0, milliseconds) / millisecondsPerSecond);
  const step = ageSteps.find((candidate) => seconds >= candidate.seconds);

  return step ? `${Math.floor(seconds / step.seconds)}${step.unit}` : 'now';
}

const two = (value: number): string => String(value).padStart(2, '0');

// How long a Voice call has run, as its timer reads it: `4:12`, or `1:01:01` past an hour. Zero until the call connects.
export function formatCallTime(startedAt: string | null, now: number): string {
  const started = startedAt === null ? now : Date.parse(startedAt);

  const seconds = Math.max(
    0,
    Math.floor((now - started) / millisecondsPerSecond),
  );

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor((seconds % secondsPerHour) / secondsPerMinute);
  const rest = two(seconds % secondsPerMinute);

  return hours > 0 ? `${hours}:${two(minutes)}:${rest}` : `${minutes}:${rest}`;
}
