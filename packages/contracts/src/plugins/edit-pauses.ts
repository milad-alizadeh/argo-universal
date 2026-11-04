/*
 * When an edit's wait is over: `fire` is called once `ms` have passed, unless the answer, which cancels it,
 * is called first. The App's clock is the real one; the test kit's moves only when a test advances it.
 */
export type PauseClock = (ms: number, fire: () => Promise<void>) => () => void;

export const realClock: PauseClock = (ms, fire) => {
  const timer = setTimeout(() => void fire(), ms);

  return () => clearTimeout(timer);
};

type Waiting = { cancel: () => void; make: () => Promise<void> };

const forget = (): void => {};

/*
 * The one wait a Plugin tree's edits share: a bound search or selection, or a throttled event's call, is
 * made once the edits pause, and an edit before then starts its key's wait again. `land` makes every
 * waiting change now and waits for those already being made, as a press that runs an Operation needs,
 * and `drop` forgets them with the tree.
 */
export class EditPauses {
  private readonly waiting = new Map<string, Waiting>();
  private readonly making = new Set<Promise<void>>();

  public constructor(private readonly clock: PauseClock) {}

  public wait(key: string, ms: number, make: () => Promise<void>): void {
    this.waiting.get(key)?.cancel();
    this.waiting.set(key, {
      cancel: this.clock(ms, () => this.made(key)),
      make,
    });
  }

  // Whether any change was waiting or being made; each has settled, failed or not, when it resolves.
  public async land(): Promise<boolean> {
    const making = [...this.making];
    const keys = [...this.waiting.keys()];

    await Promise.all([...making, ...keys.map((key) => this.made(key))]);

    return making.length + keys.length > 0;
  }

  public drop(): void {
    for (const { cancel } of this.waiting.values()) cancel();

    this.waiting.clear();
  }

  // A change that fails has already said why, and leaves the tree as it was.
  private async made(key: string): Promise<void> {
    const waiting = this.waiting.get(key);

    if (!waiting) return;

    waiting.cancel();
    this.waiting.delete(key);
    const making = waiting.make().catch(forget);
    this.making.add(making);
    await making;
    this.making.delete(making);
  }
}
