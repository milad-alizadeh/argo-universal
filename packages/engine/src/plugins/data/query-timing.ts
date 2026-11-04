import type { PluginClock } from '../clock';

// When an entry's kept answer was read, and whether a write since has made it due.
export class QueryTiming {
  private lastAt: number | null = null;
  private due = true;
  private writtenDuringRead = false;

  constructor(private readonly clock: PluginClock) {}

  get overdue(): boolean {
    return this.due;
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
