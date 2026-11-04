const firstWaitMs = 1000;
const longestWaitMs = 30_000;
// A page that has gone this long without failing is healthy again, so its next failure is a first.
const calmMs = 60_000;

type Failures = { count: number; at: number };

/*
 * How long a live page waits before it is drawn again after its subscription failed. The first failure draws
 * again at once, so a Plugin that ran again is followed afresh; each one in a row after it waits twice as long,
 * to a ceiling, so a Loader that fails after every first frame is not subscribed to at network speed.
 */
export class LiveBackoff {
  private readonly failures = new Map<string, Failures>();

  public constructor(private readonly now: () => number = Date.now) {}

  // Records a failure of the page kept under `key` and says how long to wait before drawing it again.
  public failed(key: string): number {
    const at = this.now();
    const before = this.failures.get(key);
    const count = before && at - before.at < calmMs ? before.count + 1 : 1;

    this.failures.set(key, { count, at });

    return count === 1
      ? 0
      : Math.min(longestWaitMs, firstWaitMs * 2 ** (count - 2));
  }
}
