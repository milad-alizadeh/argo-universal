import type { OperationExecution } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { FeedDeps } from '../feed';
import {
  operationWaitClock,
  operationWaitLimitMs,
  type OperationWaitClock,
} from './wait-clock';

export type WaitOptions = {
  read: () => OperationExecution;
  sessionId: string;
  watch: FeedDeps['watchSessionSnapshot'];
  clock?: OperationWaitClock;
  signal?: AbortSignal;
  stopOnInput?: boolean;
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
  public constructor(private readonly options: WaitOptions) {
    this.signal = options.signal ?? AbortSignal.any([]);
  }
  public start(): Promise<OperationExecution> {
    const initial = this.options.read();

    if (this.shouldReturn(initial)) return Promise.resolve(initial);
    this.arm();

    return this.pending.promise;
  }
  private shouldReturn(value: OperationExecution): boolean {
    if (value.status === 'settled') return true;

    return Boolean(
      this.options.stopOnInput && value.status === 'waiting_for_user',
    );
  }
  private arm(): void {
    if (this.signal.aborted) return this.aborted();
    this.signal.addEventListener('abort', this.aborted, { once: true });
    this.cleanup.add(() =>
      this.signal.removeEventListener('abort', this.aborted),
    );
    this.armDeadline();
    this.watch();
  }
  private armDeadline(): void {
    const clock = this.options.clock ?? operationWaitClock;
    this.cleanup.add(
      clock.schedule(
        () => this.finish(this.options.read),
        operationWaitLimitMs,
      ),
    );
  }
  private watch(): void {
    const subscription = this.options.watch(this.options.sessionId, {
      next: this.changed,
      error: (cause) => this.failed({ cause }),
      complete: this.changed,
    });

    this.cleanup.add(() => subscription.unsubscribe());

    if (this.finished) this.detach();
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
  private finish(read: () => OperationExecution): void {
    if (this.finished) return;
    this.finished = true;
    this.detach();

    try {
      this.pending.resolve(read());
    } catch (error) {
      this.pending.reject(error);
    }
  }
  private detach(): void {
    for (const cleanup of this.cleanup) cleanup();
    this.cleanup.clear();
  }
}
