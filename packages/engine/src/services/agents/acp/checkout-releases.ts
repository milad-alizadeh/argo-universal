const releaseTimeoutMs = 5_000;

const blockedRecovery = (cause: unknown): Error =>
  new Error(
    'The previous Agent process did not exit; recovery is blocked for this Checkout',
    { cause },
  );
const startDeadline = (
  timeoutMs: number,
): { expired: Promise<never>; clear: () => void } => {
  const deadline = Promise.withResolvers<never>();
  const timer = setTimeout(
    () => deadline.reject(new Error(`No exit within ${timeoutMs} ms`)),
    timeoutMs,
  );
  return { expired: deadline.promise, clear: () => clearTimeout(timer) };
};
const confirmWithinDeadline = async (
  released: Promise<void>,
  timeoutMs: number,
): Promise<void> => {
  const deadline = startDeadline(timeoutMs);
  try {
    await Promise.race([released, deadline.expired]);
  } catch (error) {
    throw blockedRecovery(error);
  } finally {
    deadline.clear();
  }
};

// Work in a Checkout waits until the failed generation that used it has exited.
export class CheckoutReleases {
  private readonly pending = new Map<string, Promise<void>>();
  public constructor(private readonly timeoutMs = releaseTimeoutMs) {}
  public retain(checkouts: readonly string[], released: Promise<void>): void {
    for (const checkout of checkouts) this.pending.set(checkout, released);
  }
  public async confirm(checkout: string): Promise<void> {
    const released = this.pending.get(checkout);
    if (!released) return;
    await confirmWithinDeadline(released, this.timeoutMs);
    if (this.pending.get(checkout) === released) this.pending.delete(checkout);
  }
}
