const retryDelay = 1000;

const maximumDelay = 8000;

export class NotificationRetry {
  private delay = retryDelay;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private wake: (() => void) | undefined;

  public pause(): Promise<void> {
    const waiting = new Promise<void>((resolve) => {
      this.wake = resolve;
      this.timer = setTimeout(resolve, this.delay);
    });

    this.delay = Math.min(maximumDelay, this.delay * 2);

    return waiting;
  }

  public reset(): void {
    this.delay = retryDelay;
  }

  public cancel(): void {
    clearTimeout(this.timer);
    this.wake?.();
    this.wake = undefined;
  }
}
