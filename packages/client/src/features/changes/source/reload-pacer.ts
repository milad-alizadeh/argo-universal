// How long after a reload ends before the next may start.
export const reloadQuietMs = 1000;

type Reload = () => Promise<void>;

/*
 * Reloads no more often than they can be answered. A Turn can ask many times a second; a reload that runs is never
 * started over, and everything asked while it runs, or in the quiet time after it, is answered by one more reload.
 */
export class ReloadPacer {
  private busy = false;

  private asked = false;

  // Counts reloads started and stops made, so a reload that ends after a stop is not rested after.
  private run = 0;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly reload: Reload,
    private readonly quietMs = reloadQuietMs,
  ) {}

  // Asks for a reload: at once when idle, otherwise once after the one running and its quiet time.
  request = (): void => {
    if (this.busy) this.asked = true;
    else this.start();
  };

  // Drops a reload that waits; one that runs ends on its own.
  stop = (): void => {
    clearTimeout(this.timer);
    this.run += 1;
    this.busy = false;
    this.asked = false;
  };

  private start(): void {
    this.run += 1;
    this.busy = true;
    this.asked = false;
    const rest = this.restAfter(this.run);

    // A failed reload is the queries' to report; the pacer only waits for it to end.
    void this.reload().then(rest, rest);
  }

  private restAfter(started: number): () => void {
    return (): void => {
      if (started !== this.run) return;

      this.timer = setTimeout(this.wake, this.quietMs);
    };
  }

  private wake = (): void => {
    this.busy = false;

    if (this.asked) this.start();
  };
}
