import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

interface Reporter {
  onTestRunEnd?: () => void;
}

// The part of Vitest this reads.
export interface RunHost {
  reporters: Reporter[];
  config: { teardownTimeout: number };
}

const exposedByVitest = z.object({
  reporters: z.array(z.custom<Reporter>()),
  config: z.object({ teardownTimeout: z.number() }),
});

/*
 * Vitest keeps its reporters private, but reads them by name when it reports, which is the only way to hear a run end from a global setup.
 * Checked, not copied, since the reporter must go into Vitest's own list.
 */
export const runHostSchema = z.custom<RunHost>(
  (value): boolean => exposedByVitest.safeParse(value).success,
  'Vitest no longer exposes its reporters and teardown timeout, which the browser-suite lock reads to hand itself back when the tests end.',
);

/*
 * Vitest hands the lock back in its global teardown, which only runs once everything before it has settled, and arms its own exit timer only after the whole close finishes.
 * A run that has passed but then stalls anywhere in between (#1680) would hold the lock, and idle browsers, until someone kills it.
 * So the lock goes back when the tests end, and a process still alive a teardown timeout later is ended, as Vitest's own timer would have done.
 */
export function releaseAtRunEnd(
  host: RunHost,
  release: () => void,
  exit: () => void,
): void {
  host.reporters.push({
    onTestRunEnd(): void {
      release();
      // Unref'd, so a process that is already ending is never held up by it.
      void delay(host.config.teardownTimeout, undefined, { ref: false }).then(
        exit,
      );
    },
  });
}
