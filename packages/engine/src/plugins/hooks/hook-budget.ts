// A Hook's time limit. It stops while the Hook waits on `next`, so only the Hook's own time counts.
export class HookBudget {
  private remaining: number;
  private startedAt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    limitMs: number,
    private readonly expired: () => void,
  ) {
    this.remaining = limitMs;
  }

  public start(): void {
    this.startedAt = Date.now();
    this.timer = setTimeout(this.expired, this.remaining);
  }

  public pause(): void {
    this.stop();
    this.remaining -= Date.now() - this.startedAt;
  }

  public stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
