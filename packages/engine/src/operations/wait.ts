import type { OperationExecution } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { SessionWorkWatcher } from '../sessions';
import {
  operationWaitClock,
  operationWaitLimitMs,
  type OperationWaitClock,
} from './wait-clock';
import type { WorkObservation } from './work-observation';

export type WaitOptions = {
  read: () => WorkObservation;
  watch: SessionWorkWatcher;
  clock?: OperationWaitClock;
  signal?: AbortSignal;
  stopOnInput?: boolean;
  limitMs?: number;
};

type WorkFailure = { cause: unknown };

// Detaching this observer never cancels the native Session work.
export function waitForNativeWork(
  options: WaitOptions,
): Promise<OperationExecution> {
  return new NativeWorkObserver(options).start();
}

class NativeWorkObserver {
  private finished = false;
  private readonly pending = Promise.withResolvers<OperationExecution>();
  private readonly cleanup = new Set<() => void>();
  private readonly signal: AbortSignal;
  private watching: { sessionId: string; stop: () => void } | undefined;
  public constructor(private readonly options: WaitOptions) {
    this.signal = options.signal ?? AbortSignal.any([]);
  }
  public start(): Promise<OperationExecution> {
    const initial = this.options.read();

    if (this.shouldReturn(initial)) return Promise.resolve(initial.execution);
    this.arm(initial);

    return this.pending.promise;
  }
  private shouldReturn(value: WorkObservation): boolean {
    if (value.execution.status === 'settled') return true;

    return this.options.stopOnInput ? stoppedAtNativeInput(value) : false;
  }
  private arm(initial: WorkObservation): void {
    if (this.signal.aborted) return this.aborted();
    this.signal.addEventListener('abort', this.aborted, { once: true });
    this.cleanup.add(() =>
      this.signal.removeEventListener('abort', this.aborted),
    );
    this.armDeadline();
    this.watch(initial);
  }
  private armDeadline(): void {
    const clock = this.options.clock ?? operationWaitClock;
    this.cleanup.add(
      clock.schedule(
        () => this.finish(this.options.read),
        this.options.limitMs ?? operationWaitLimitMs,
      ),
    );
  }
  private watch(value: WorkObservation): void {
    if (this.watching?.sessionId === value.sessionId) return;
    this.unwatch();

    const subscription = this.options.watch(value.sessionId, {
      next: this.changed,
      error: (cause) => this.failed({ cause }),
      complete: this.changed,
    });

    const stop = (): void => subscription.unsubscribe();
    this.watching = { sessionId: value.sessionId, stop };
    this.cleanup.add(stop);

    if (this.finished) this.detach();
  }
  private unwatch(): void {
    if (!this.watching) return;
    this.watching.stop();
    this.cleanup.delete(this.watching.stop);
  }
  // Let actor publication and its command receipts settle before reading again.
  private readonly changed = (): void => {
    setImmediate(() => this.readChanged());
  };
  private readChanged(): void {
    if (this.finished) return;

    this.readSafely();
  }
  private readSafely(): void {
    try {
      const value = this.options.read();

      if (this.shouldReturn(value)) this.finish(() => value);
      else this.watch(value);
    } catch (error) {
      this.failed({ cause: error });
    }
  }
  private readonly failed = ({ cause }: WorkFailure): void =>
    this.finish(() => {
      throw cause;
    });
  private readonly aborted = (): void =>
    this.failed({
      cause: new TRPCError({
        code: 'CLIENT_CLOSED_REQUEST',
        message: 'The wait was disconnected',
      }),
    });
  private finish(read: () => WorkObservation): void {
    if (this.finished) return;
    this.finished = true;
    this.detach();

    try {
      this.pending.resolve(read().execution);
    } catch (error) {
      this.pending.reject(error);
    }
  }
  private detach(): void {
    for (const cleanup of this.cleanup) cleanup();
    this.cleanup.clear();
  }
}

function stoppedAtNativeInput(value: WorkObservation): boolean {
  return value.started || value.execution.status === 'waiting_for_user';
}
