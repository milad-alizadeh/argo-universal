// What a test view waits on: the view stream announces each message and ends once, and no clock is involved.
export class ViewChanges {
  private ended = false;
  private readonly waiters = new Set<() => void>();

  public announce(): void {
    const waiting = [...this.waiters];
    this.waiters.clear();

    for (const resolve of waiting) resolve();
  }

  public end(): void {
    this.ended = true;
    this.announce();
  }

  // Rechecks `ready` after every announcement; fails once the stream has ended without `ready` holding.
  public async until(
    ready: () => boolean,
    closure: () => Error,
  ): Promise<void> {
    while (!ready()) {
      if (this.ended) throw closure();
      await new Promise<void>((resolve) => this.waiters.add(resolve));
    }
  }
}
