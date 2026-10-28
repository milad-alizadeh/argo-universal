import { TRPCError } from '@trpc/server';

// The one clock an Operation wait's deadline runs on, so a test that drives it drives the deadline.
export interface OperationWaitClock {
  schedule: (callback: () => void, milliseconds: number) => () => void;
}

export const operationWaitLimitMs = 90_000;

export const operationWaitClock: OperationWaitClock = {
  schedule: (callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);

    return (): void => clearTimeout(timer);
  },
};

export function admissionTimedOut(): never {
  throw new TRPCError({
    code: 'TIMEOUT',
    message: 'The Operation did not finish admission within ninety seconds',
  });
}
