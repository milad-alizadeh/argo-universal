import type { OperationExecution } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { Subscription } from 'xstate';
import type { FeedDeps } from '../feed';
import {
  operationWaitClock,
  operationWaitLimitMs,
  type OperationWaitClock,
} from './wait-clock';

type WaitOptions = {
  read: () => OperationExecution;
  sessionId: string;
  watch: FeedDeps['watchSessionSnapshot'];
  clock?: OperationWaitClock;
  signal?: AbortSignal;
  stopOnInput?: boolean;
};

// Detaching this observer never cancels the native Session work.
export function waitForNativeWork(
  options: WaitOptions,
): Promise<OperationExecution> {
  const initial = options.read();
  if (
    initial.status === 'settled' ||
    (options.stopOnInput && initial.status === 'waiting_for_user')
  )
    return Promise.resolve(initial);
  return new Promise((resolve, reject) => {
    let finished = false;
    let subscription: Subscription | undefined;
    let cancelDeadline: (() => void) | undefined;
    const finish = (read: () => OperationExecution): void => {
      if (finished) return;
      finished = true;
      subscription?.unsubscribe();
      cancelDeadline?.();
      options.signal?.removeEventListener('abort', aborted);
      try {
        resolve(read());
      } catch (error) {
        reject(error);
      }
    };
    const aborted = (): void =>
      finish(() => {
        throw new TRPCError({
          code: 'CLIENT_CLOSED_REQUEST',
          message: 'The wait was disconnected',
        });
      });
    const changed = (): void => {
      if (finished) return;
      try {
        const value = options.read();
        if (
          value.status === 'settled' ||
          (options.stopOnInput && value.status === 'waiting_for_user')
        )
          finish(() => value);
      } catch (error) {
        finish(() => {
          throw error;
        });
      }
    };
    if (options.signal?.aborted) return aborted();
    options.signal?.addEventListener('abort', aborted, { once: true });
    cancelDeadline = (options.clock ?? operationWaitClock).schedule(
      () => finish(options.read),
      operationWaitLimitMs,
    );
    // Actor publication can precede getSnapshot(); read after the current event commits.
    subscription = options.watch(options.sessionId, {
      next: () => queueMicrotask(changed),
      error: (error) =>
        finish(() => {
          throw error;
        }),
      complete: () => queueMicrotask(changed),
    });
    if (finished) subscription.unsubscribe();
  });
}
