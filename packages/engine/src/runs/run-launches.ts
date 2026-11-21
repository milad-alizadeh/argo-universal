import { TRPCError } from '@trpc/server';
import type { LiveRun } from './live-run';
import type { RunCheckout } from './runs';

const checkoutKeyOf = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

// Allow shutdown to wait for admitted launches while refusing new launches.
export class RunLaunches {
  private readonly pending = new Map<
    string,
    { checkoutKey: string; run: Promise<LiveRun> }
  >();
  private readonly removing = new Map<string, Promise<void>>();
  private closing = false;

  public requireOpen(checkout: RunCheckout): void {
    if (this.closing || this.removing.has(checkoutKeyOf(checkout)))
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Cannot start a Run while the Server or Checkout is closing.',
      });
  }

  public start(
    key: string,
    checkout: RunCheckout,
    launch: () => Promise<LiveRun>,
  ): Promise<LiveRun> {
    const pending = this.pending.get(key);
    if (pending) return pending.run;

    const run = launch().finally(() => this.pending.delete(key));
    this.pending.set(key, { checkoutKey: checkoutKeyOf(checkout), run });

    return run;
  }

  public get(key: string): Promise<LiveRun> | undefined {
    return this.pending.get(key)?.run;
  }

  public removeCheckout(
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ): Promise<void> {
    const key = checkoutKeyOf(checkout);
    const pending = this.removing.get(key);
    if (pending) return pending;

    const removing = this.drainCheckout(key)
      .then(remove)
      .finally(() => this.removing.delete(key));
    this.removing.set(key, removing);

    return removing;
  }

  public async close(): Promise<void> {
    this.closing = true;
    await Promise.allSettled(this.pending.values().map(({ run }) => run));
  }

  private async drainCheckout(key: string): Promise<void> {
    await Promise.allSettled(
      this.pending
        .values()
        .filter(({ checkoutKey }) => checkoutKey === key)
        .map(({ run }) => run),
    );
  }
}
