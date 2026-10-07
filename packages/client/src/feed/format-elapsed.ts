export const millisecondsPerSecond = 1000;

const pad = (value: number) => String(value).padStart(2, '0');

// A Turn's elapsed time for the live header: "41s", "2m 14s", "1h 02m".
export function formatElapsed(milliseconds: number) {
  const seconds = Math.floor(Math.max(0, milliseconds) / millisecondsPerSecond);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}
