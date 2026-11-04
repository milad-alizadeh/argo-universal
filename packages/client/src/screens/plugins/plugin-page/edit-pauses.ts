type Waiting = {
  timer: ReturnType<typeof setTimeout>;
  then: () => Promise<void>;
};

/*
 * The one wait a Loader page's edits share: a bound search or selection, or a throttled event's call, is
 * made once the edits pause, and an edit before then starts its key's wait again. `land` makes every
 * waiting change now, as a press that runs an Operation needs, and `drop` forgets them with the page.
 */
export class EditPauses {
  private readonly waiting = new Map<string, Waiting>();

  public wait(key: string, ms: number, then: () => Promise<void>): void {
    clearTimeout(this.waiting.get(key)?.timer);
    this.waiting.set(key, {
      timer: setTimeout(() => void this.made(key), ms),
      then,
    });
  }

  // Whether anything was waiting; every change it made has settled, failed or not, when it resolves.
  public async land(): Promise<boolean> {
    const keys = [...this.waiting.keys()];

    await Promise.all(keys.map((key) => this.made(key)));

    return keys.length > 0;
  }

  public drop(): void {
    for (const { timer } of this.waiting.values()) clearTimeout(timer);

    this.waiting.clear();
  }

  // A change that fails has already said why, and leaves the page as it was.
  private async made(key: string): Promise<void> {
    const waiting = this.waiting.get(key);

    if (!waiting) return;

    clearTimeout(waiting.timer);
    this.waiting.delete(key);
    await waiting.then().catch(() => undefined);
  }
}
