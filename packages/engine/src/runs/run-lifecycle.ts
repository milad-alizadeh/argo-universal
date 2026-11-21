import { TRPCError } from '@trpc/server';
import type { LiveRun } from './live-run';
import { serially } from './run-blocks';
import type { RunCheckout } from './runs';

const checkoutKeyOf = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

// Owns starting and stopping terminals, including Checkout removal and Server shutdown.
export class RunLifecycle {
  private readonly pending = new Map<
    string,
    { checkoutKey: string; run: Promise<LiveRun> }
  >();
  // Only one launch reserves ports before its Terminal appears in the live Runs.
  private readonly queued = serially();
  private readonly removing = new Map<string, Promise<void>>();
  private closing = false;

  public constructor(private readonly live: Map<string, LiveRun>) {}

  public start(
    key: string,
    checkout: RunCheckout,
    launch: () => Promise<LiveRun>,
  ): Promise<LiveRun> {
    this.requireOpen(checkout);
    const existing = this.live.get(key);

    if (existing?.stopping)
      return existing.stopping.then(() => this.start(key, checkout, launch));

    return existing
      ? Promise.resolve(existing)
      : this.launch(key, checkout, launch);
  }

  public launchShell<T>(
    checkout: RunCheckout,
    launch: () => Promise<T>,
  ): Promise<T> {
    this.requireOpen(checkout);

    return this.queued(launch);
  }

  public async stop(key: string): Promise<void> {
    const run = this.live.get(key) ?? (await this.pending.get(key)?.run);

    if (run) await this.stopTerminal(key, run);
  }

  public removeCheckout(
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ): Promise<void> {
    const key = checkoutKeyOf(checkout);
    const pending = this.removing.get(key);

    if (pending) return pending;

    const removing = this.drainCheckout(key)
      .then(() => this.stopCheckout(key))
      .then(remove)
      .finally(() => this.removing.delete(key));

    this.removing.set(key, removing);

    return removing;
  }

  public async close(): Promise<void> {
    this.closing = true;

    await Promise.allSettled(this.pending.values().map(({ run }) => run));
    await Promise.all(
      this.live.entries().map(([key, run]) => this.stopTerminal(key, run)),
    );
  }

  private requireOpen(checkout: RunCheckout): void {
    if (this.closing || this.removing.has(checkoutKeyOf(checkout)))
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Cannot start a Run while the Server or Checkout is closing.',
      });
  }

  private launch(
    key: string,
    checkout: RunCheckout,
    launch: () => Promise<LiveRun>,
  ): Promise<LiveRun> {
    const pending = this.pending.get(key);

    if (pending) return pending.run;

    const run = this.queued(launch).finally(() => this.pending.delete(key));
    this.pending.set(key, { checkoutKey: checkoutKeyOf(checkout), run });

    return run;
  }

  private async stopCheckout(checkoutKey: string): Promise<void> {
    await Promise.all(
      this.live
        .entries()
        .filter(([, run]) => checkoutKeyOf(run.record) === checkoutKey)
        .map(([key, run]) => this.stopTerminal(key, run)),
    );
  }

  private stopTerminal(key: string, run: LiveRun): Promise<void> {
    run.stopping ??= Promise.resolve().then(() => this.finishStop(key, run));

    return run.stopping;
  }

  private async finishStop(key: string, run: LiveRun): Promise<void> {
    await run.terminal.stop();
    await run.ended.promise;

    // Keep the Run registered until its terminal finishes cleaning up listeners.
    this.live.delete(key);
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
