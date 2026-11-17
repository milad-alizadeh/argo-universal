import type { PluginClock } from '../clock';

// How long a Query rests after its first failed read, doubling with each failure in a row up to the longest rest (#2197).
export const failureBackoffMs = 5000;

export const longestBackoffMs = 300_000;

// When an entry's kept answer was read, whether a write since has made it due, and how long it rests after failing.
export class QueryTiming {
  private lastAt: number | null = null;
  private due = true;
  private writtenDuringRead = false;
  private failures = 0;
  private restsUntil = 0;

  constructor(private readonly clock: PluginClock) {}

  // Whether the last reads failed and the rest they earned is not over: no read is made until it is.
  get resting(): boolean {
    return this.failures > 0 && this.clock.now() < this.restsUntil;
  }

  failed(): void {
    this.failures += 1;
    this.restsUntil =
      this.clock.now() +
      Math.min(failureBackoffMs * 2 ** (this.failures - 1), longestBackoffMs);
  }

  answered(): void {
    this.failures = 0;
  }

  get overdue(): boolean {
    return this.due;
  }

  // A write landed since the read in flight began.
  get overtaken(): boolean {
    return this.writtenDuringRead;
  }

  // Whether the last read finished at least `ms` ago; never, without an interval.
  olderThan(ms: number | undefined): boolean {
    return (
      ms !== undefined &&
      this.lastAt !== null &&
      this.clock.now() - this.lastAt >= ms
    );
  }

  makeDue(): void {
    this.due = true;
    this.writtenDuringRead = true;
  }

  started(): void {
    this.writtenDuringRead = false;
  }

  // An answer read before a write lands still due, so the next Loader read waits for a fresh one.
  finished(): void {
    this.lastAt = this.clock.now();

    if (!this.writtenDuringRead) this.due = false;
  }
}
