/**
 * Aborts its signal like AbortSignal.timeout, but the clock can be restarted
 * for the next phase of a trial.
 */
export class RuntimeDeadline {
  private readonly controller = new AbortController();
  private timer: NodeJS.Timeout | undefined;

  constructor(firstMs: number) {
    this.restart(firstMs);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  restart(ms: number): void {
    this.stop();
    this.timer = setTimeout(() => {
      this.controller.abort(
        new DOMException('The operation timed out.', 'TimeoutError'),
      );
    }, ms).unref();
  }

  stop(): void {
    clearTimeout(this.timer);
  }
}
