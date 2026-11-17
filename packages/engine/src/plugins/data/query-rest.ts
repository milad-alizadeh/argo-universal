import type { QueryOwner, QueryServices } from './query-types';

// How long a Query rests after its first failed read, doubling with each failure in a row up to the longest rest (#2197).
export const failureBackoffMs = 5000;

export const longestBackoffMs = 300_000;

// A rate limit that reopens later than this is not waited out in full.
export const longestLimitMs = 3_600_000;

// What a failed Query needs of the Server: the time, a timer, and when the limit its read ran into reopens.
export type RestServices = {
  now: () => number;
  schedule: (callback: () => void, ms: number) => () => void;
  limitedUntil: (since: number) => number | undefined;
};

// A Query's rest runs on the Server's clock, and asks the Plugin's fetches whether a rate limit stopped its read.
export const restServices = (
  { pluginId }: QueryOwner,
  { clock, services }: QueryServices,
): RestServices => ({
  now: clock.now,
  schedule: clock.schedule,
  limitedUntil: (since) => services.limitedUntil(pluginId, since),
});

/*
 * The rest a failed Query takes. A failed read, whether it threw or answered failed, earns a rest in which no read is
 * made and the last good answer is served with the failure. The rest is the backoff, or until the rate limit the read
 * ran into reopens when that is later. A write or a pull ends it at once, and when it ends on its own the pages that
 * hold the Query are read for again, with no draw to ask.
 */
export class QueryRest {
  private failures = 0;
  private until = 0;
  private since = 0;
  private cancelTimer: (() => void) | undefined;

  constructor(
    private readonly services: RestServices,
    private readonly again: () => void,
  ) {}

  get resting(): boolean {
    return this.services.now() < this.until;
  }

  // A read begins: a limit it runs into is one that was touched from now on.
  began(): void {
    this.since = this.services.now();
  }

  // How a read ended; `held` says whether pages are waiting on the Query, which are then read again when the rest ends.
  read(answered: boolean, held: boolean): void {
    if (answered) this.succeed();
    else this.fail(held);
  }

  // A pull asks for a fresh answer whatever the rest.
  pulled(fresh: boolean): void {
    if (fresh) this.stop();
  }

  // A write or a pull says what failed may not fail now, so the next read is made.
  stop(): void {
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.until = 0;
  }

  // A read that answered ends any rest, such as one a read overtaken by a write made in the meantime.
  private succeed(): void {
    this.failures = 0;
    this.stop();
  }

  private fail(held: boolean): void {
    const now = this.services.now();

    const limited = Math.min(
      this.services.limitedUntil(this.since) ?? 0,
      now + longestLimitMs,
    );

    this.failures += 1;
    this.until = Math.max(now + this.backoff(), limited);
    this.wake(held);
  }

  private backoff(): number {
    return Math.min(
      failureBackoffMs * 2 ** (this.failures - 1),
      longestBackoffMs,
    );
  }

  private wake(held: boolean): void {
    this.cancelTimer?.();
    this.cancelTimer = held
      ? this.services.schedule(
          () => this.over(),
          this.until - this.services.now(),
        )
      : undefined;
  }

  // A timer can fire a moment before the clock agrees, so a rest not yet over waits again.
  private over(): void {
    this.cancelTimer = undefined;

    if (this.resting) this.wake(true);
    else this.again();
  }
}
