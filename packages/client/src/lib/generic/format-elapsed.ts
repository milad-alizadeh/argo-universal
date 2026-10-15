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
