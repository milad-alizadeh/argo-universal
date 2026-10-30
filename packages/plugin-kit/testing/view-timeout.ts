import { setTimeout as delay } from 'node:timers/promises';

// A 1 ms poll that comes back this much later says the event loop was starved, not that the view is slow.
const stalledPollMs = 250;

// stallMs is the longest a 1 ms poll took to come back.
type Waited = { waitedMs: number; stallMs: number };

// Polls every millisecond until ready; on the limit it throws the message built from how long it waited and stalled.
export async function pollUntil(
  ready: () => boolean,
  limitMs: number,
  message: (waited: Waited) => string,
): Promise<void> {
  const started = Date.now();
  let stallMs = 0;

  while (!ready()) {
    const now = Date.now();

    if (now - started >= limitMs)
      throw new Error(message({ waitedMs: now - started, stallMs }));
    await delay(1);
    stallMs = Math.max(stallMs, Date.now() - now);
  }
}

type Timeout = Waited & {
  what: string | undefined;
  limitMs: number;
  // Trees rendered so far, or undefined when no view message had arrived.
  trees: number | undefined;
};

// Says whether a wait ran out because the view never came or because the machine was too busy to run it.
export function viewTimeoutMessage(timeout: Timeout): string {
  const waiting = timeout.what ? ` (waiting for ${timeout.what})` : '';

  const arrived =
    timeout.trees === undefined
      ? 'no view message had arrived'
      : `the view had rendered ${timeout.trees} tree(s)`;

  return `Plugin view did not reach the expected state${waiting} within ${timeout.limitMs} ms (waited ${timeout.waitedMs} ms; ${arrived}). ${stallVerdict(timeout.stallMs)}`;
}

function stallVerdict(stallMs: number): string {
  if (stallMs >= stalledPollMs)
    return `This process stalled for ${stallMs} ms during the wait, so the machine was busy: suspect load before the Plugin.`;

  return `This process stayed responsive (longest stall ${stallMs} ms), but the Plugin host runs in another process, so a busy machine is not ruled out: check the load average before blaming the Plugin.`;
}
