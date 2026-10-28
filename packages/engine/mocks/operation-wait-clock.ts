import type { OperationWaitClock } from '../src/operations';

export class TestOperationWaitClock implements OperationWaitClock {
  private elapsed = 0;
  private readonly timers = new Set<{ at: number; callback: () => void }>();
  private scheduled = Promise.withResolvers<void>();
  public schedule = (
    callback: () => void,
    milliseconds: number,
  ): (() => void) => {
    const timer = { at: this.elapsed + milliseconds, callback };
    this.timers.add(timer);
    this.scheduled.resolve();
    this.scheduled = Promise.withResolvers<void>();

    return (): void => {
      this.timers.delete(timer);
    };
  };
  public waitUntilScheduled(): Promise<void> {
    return this.timers.size > 0 ? Promise.resolve() : this.scheduled.promise;
  }
  public activeDeadlines(): number {
    return this.timers.size;
  }
  public advance(milliseconds: number): void {
    this.elapsed += milliseconds;

    for (const timer of this.timers) {
      if (timer.at > this.elapsed) continue;
      this.timers.delete(timer);
      timer.callback();
    }
  }
}
