// A count of changes to any items Slot; an open list waits for it to move past what it last read.
export class SlotItemChanges {
  private count = 0;
  private closed = false;
  private readonly waiting = new Set<() => void>();

  get version(): number {
    return this.count;
  }

  bump(): void {
    this.count += 1;
    this.wake();
  }

  // Resolves true once the count passes `version`, false when the list closes or the runtime does.
  async after(version: number, signal: AbortSignal): Promise<boolean> {
    while (this.waits(version, signal)) await this.next(signal);

    return this.count !== version && !signal.aborted;
  }

  private waits(version: number, signal: AbortSignal): boolean {
    return this.count === version && !this.closed && !signal.aborted;
  }

  private next(signal: AbortSignal): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();

    const done = (): void => {
      this.waiting.delete(done);
      signal.removeEventListener('abort', done);
      resolve();
    };

    this.waiting.add(done);
    signal.addEventListener('abort', done, { once: true });

    return promise;
  }

  private wake(): void {
    // A Set visits each callback once even as `done` deletes it.
    for (const done of this.waiting) done();
  }

  close(): void {
    this.closed = true;
    this.wake();
  }
}
