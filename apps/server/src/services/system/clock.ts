import type { ClockTick } from '@repo/contracts';

const tickIntervalMs = 1000;

// Resolves after `ms`, or at once when the signal aborts.
const sleep = (ms: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    signal?.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', done);
      resolve();
    }
  });

export async function* clock(
  signal: AbortSignal | undefined,
): AsyncGenerator<ClockTick> {
  while (!signal?.aborted) {
    yield { now: new Date().toISOString() };
    await sleep(tickIntervalMs, signal);
  }
}
