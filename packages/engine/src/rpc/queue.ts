// Items waiting for the stream to take them, and a way to wait for the next.
export class Queue<Item> {
  private readonly waiting: Item[] = [];
  private wake: (() => void) | undefined;

  public push(item: Item): void {
    this.waiting.push(item);
    this.wake?.();
  }

  public async *items(signal: AbortSignal): AsyncGenerator<Item> {
    while (!signal.aborted) {
      const next = this.waiting.shift();

      if (next === undefined) await this.nextPush(signal);
      else yield next;
    }
  }

  private nextPush(signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = (): void => {
        signal.removeEventListener('abort', done);
        this.wake = undefined;
        resolve();
      };

      this.wake = done;
      signal.addEventListener('abort', done, { once: true });
    });
  }
}
