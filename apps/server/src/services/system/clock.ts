import type { ClockTick } from '@repo/contracts';

const tickIntervalMs = 1000;

// Resolves after `milliseconds`, or at once when the signal aborts.
const sleep = (milliseconds: number, signal: AbortSignal | undefined) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(done, milliseconds);
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
