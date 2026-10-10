const releaseTimeoutMs = 5_000;

export class RecoveryBlockedError extends Error {
  public constructor(cause: unknown) {
    super(
      'The previous Agent process did not exit; recovery is blocked for this Checkout',
      { cause },
    );
  }
}
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
    throw new RecoveryBlockedError(error);
  } finally {
    deadline.clear();
  }
};

/*
 * Work in a Checkout waits until the failed generation that used it has exited.
 * The deadline runs from the failure; a missed one keeps the Checkout blocked.
 */
export class CheckoutReleases {
  private readonly pending = new Map<string, Promise<void>>();
  public constructor(private readonly timeoutMs = releaseTimeoutMs) {}
  public retain(checkouts: readonly string[], released: Promise<void>): void {
    const confirmed = confirmWithinDeadline(released, this.timeoutMs);
    confirmed.catch(() => {});
    for (const checkout of checkouts) this.pending.set(checkout, confirmed);
  }
  public async confirm(checkout: string): Promise<void> {
    const confirmed = this.pending.get(checkout);
    if (!confirmed) return;
    await confirmed;
    if (this.pending.get(checkout) === confirmed) this.pending.delete(checkout);
  }
}
