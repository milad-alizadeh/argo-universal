import type { PluginClock } from '../clock';

// A Hook's wall-clock limit stops only while it waits on `next`.
export class HookBudget {
  private remaining: number;
  private startedAt = 0;
  private cancel: (() => void) | null = null;
  private holds = 0;
  private stopped = false;

  public constructor(
    limitMs: number,
    private readonly expired: () => void,
    private readonly clock: PluginClock,
  ) {
    this.remaining = limitMs;
  }

  public start(): void {
    if (this.stopped || this.holds > 0) return;
    this.startedAt = this.clock.now();
    this.cancel = this.clock.schedule(this.expired, this.remaining);
  }

  // Waits can overlap; the clock runs again once the last one ends.
  public hold(): void {
    this.holds += 1;

    if (this.holds === 1) this.pause();
  }

  public release(): void {
    this.holds -= 1;
    this.start();
  }

  public stop(): void {
    this.stopped = true;
    this.pause();
  }

  private pause(): void {
    if (!this.cancel) return;
    this.cancel();
    this.cancel = null;
    this.remaining -= this.clock.now() - this.startedAt;
  }
}
