import type { PluginClock } from '../clock';
import type { QueryWatchers } from './query-watchers';

export class QueryTiming {
  private cancel: () => void = () => {};
  private lastAt: number | null = null;
  private dueAt = 0;
  private remountDue = false;

  constructor(
    private readonly clock: PluginClock,
    private readonly refresh: () => void,
  ) {}

  get overdue(): boolean {
    return this.dueAt <= this.clock.now();
  }
  get ran(): boolean {
    return this.lastAt !== null;
  }

  makeDue(): void {
    this.dueAt = this.clock.now();
    this.remountDue = true;
  }

  started(): void {
    this.cancel();
    this.remountDue = false;
  }

  finished(watchers: QueryWatchers): void {
    const { active, backgroundPeriod } = watchers.pacing();

    this.lastAt = this.clock.now();

    if (this.remountDue && !active) return;
    this.remountDue = false;
    this.dueAt = this.lastAt + backgroundPeriod;
  }

  schedule(watchers: QueryWatchers): void {
    const { active, period } = watchers.pacing();

    this.cancel();

    if (!active) return;
    this.schedulePeriod(period);
  }

  private schedulePeriod(period: number): void {
    if (!Number.isFinite(period)) return;

    if (this.lastAt === null) return;
    this.dueAt = this.lastAt + period;
    this.cancel = this.clock.schedule(
      this.refresh,
      Math.max(0, this.dueAt - this.clock.now()),
    );
  }

  close(): void {
    this.cancel();
  }
}
