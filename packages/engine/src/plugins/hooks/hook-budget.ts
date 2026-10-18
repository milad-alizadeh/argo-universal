// A Hook's time limit. It stops while the Hook waits on `next` or on its Plugin's `argo` calls, so only the Hook's own time counts.
export class HookBudget {
  private remaining: number;
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private holds = 0;
  private stopped = false;

  public constructor(
    limitMs: number,
    private readonly expired: () => void,
  ) {
    this.remaining = limitMs;
  }

  public start(): void {
    if (this.stopped || this.holds > 0) return;
    this.startedAt = Date.now();
    this.timer = setTimeout(this.expired, this.remaining);
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
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.remaining -= Date.now() - this.startedAt;
  }
}
