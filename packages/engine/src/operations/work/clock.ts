import { TRPCError } from '@trpc/server';

export { operationWaitLimitMs } from '@repo/contracts/operations/control';

// The one clock an Operation wait's deadline runs on, so a test that drives it drives the deadline.
export interface OperationWaitClock {
  schedule: (callback: () => void, milliseconds: number) => () => void;
}

export type ObservationOptions = { signal?: AbortSignal; timeoutMs?: number };

export const operationWaitClock: OperationWaitClock = {
  schedule: (callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);

    return (): void => clearTimeout(timer);
  },
};

export function admissionTimedOut(): never {
  throw new TRPCError({
    code: 'TIMEOUT',
    message: 'The Operation did not finish admission before the wait timed out',
  });
}
