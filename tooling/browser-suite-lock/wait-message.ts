import type { BrowserSuiteHolder, WaitReport } from './browser-suite-lock.ts';

const MS_PER_SECOND = 1000;

const SECONDS_PER_MINUTE = 60;

const SECONDS_PER_HOUR = 3600;

// "4h 3m", "2m 5s" or "9s": whole units, so a line says whether to wait seconds or hours.
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / MS_PER_SECOND));
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE) % SECONDS_PER_MINUTE;
  const hours = Math.floor(seconds / SECONDS_PER_HOUR);

  if (hours > 0) return `${hours}h ${minutes}m`;

  return minutes > 0
    ? `${minutes}m ${seconds % SECONDS_PER_MINUTE}s`
    : `${seconds % SECONDS_PER_MINUTE}s`;
}

const running = (holder: BrowserSuiteHolder): string =>
  holder.command ? `, running \`${holder.command}\`` : '';

export function describeHolder(
  holder: BrowserSuiteHolder | undefined,
  now: number = Date.now(),
): string {
  if (!holder) return 'whatever holds the browser-suite lock port';

  const held = formatDuration(now - Date.parse(holder.since));

  return `the browser suite in ${holder.cwd} (pid ${holder.pid}${running(holder)}, held for ${held})`;
}

export const printWaiting: WaitReport = (holder, waitedMs): void => {
  process.stdout.write(
    `Waiting ${formatDuration(waitedMs)} for ${describeHolder(holder)} to finish; one browser suite runs at a time on this Mac.\n`,
  );
};
