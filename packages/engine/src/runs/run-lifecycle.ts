import { TRPCError } from '@trpc/server';
import type { LiveRun } from './live-run';
import { serially } from './run-blocks';
import type { RunRecord } from './run-store';
import type { RunCheckout } from './runs';

const checkoutKeyOf = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

type CheckoutClosure = {
  ended: Promise<void>;
  removal?: Promise<void>;
};

// Owns starting and stopping terminals, including Checkout removal and Server shutdown.
export class RunLifecycle {
  private readonly pending = new Map<
    string,
    { checkoutKey: string; run: Promise<LiveRun> }
  >();
  // Only one launch reserves ports before its Terminal appears in the live Runs.
  private readonly queued = serially();
  private readonly closingCheckouts = new Map<string, CheckoutClosure>();
  private closing = false;

  public constructor(private readonly live: Map<string, LiveRun>) {}

  public activeRecords(checkout: RunCheckout): RunRecord[] {
    const key = checkoutKeyOf(checkout);

    return this.live
      .values()
      .map(({ record }) => record)
      .filter(
        (record) =>
          checkoutKeyOf(record) === key &&
          (record.status === 'starting' || record.status === 'ready'),
      )
      .toArray();
  }

  public start(
    key: string,
    checkout: RunCheckout,
    launch: () => Promise<LiveRun>,
  ): Promise<LiveRun> {
    this.requireOpen(checkout);
    const existing = this.live.get(key);

    const releasing = existing?.whenReleased();

    if (releasing)
      return releasing.then(() => this.start(key, checkout, launch));

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

  public closeCheckout(
    checkout: RunCheckout,
    closeShells: () => Promise<void>,
    remove?: () => Promise<void>,
  ): Promise<void> {
    const key = checkoutKeyOf(checkout);

    const closing =
      this.closingCheckouts.get(key) ?? this.endCheckout(key, closeShells);

    if (!remove) return closing.removal ?? closing.ended;

    closing.removal ??= closing.ended
      .then(remove)
      .finally(() => this.closingCheckouts.delete(key));

    return closing.removal;
  }

  private endCheckout(
    key: string,
    closeShells: () => Promise<void>,
  ): CheckoutClosure {
    const ended = this.drainCheckout(key)
      .then(() => this.stopCheckout(key))
      .then(closeShells);

    const closing: CheckoutClosure = { ended };

    this.closingCheckouts.set(key, closing);

    const release = (): void => {
      if (!closing.removal) this.closingCheckouts.delete(key);
    };

    void ended.then(release, release);

    return closing;
  }

  public async close(): Promise<void> {
    this.closing = true;

    await Promise.allSettled(this.pending.values().map(({ run }) => run));
    await Promise.all(
      this.live.entries().map(([key, run]) => this.stopTerminal(key, run)),
    );
  }

  private requireOpen(checkout: RunCheckout): void {
    if (this.closing || this.closingCheckouts.has(checkoutKeyOf(checkout)))
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
    // Keep the Run registered until its terminal finishes cleaning up listeners.
    return run.stop(() => this.live.delete(key));
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
