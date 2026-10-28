import { TRPCError } from '@trpc/server';
import {
  operationWaitClock,
  operationWaitLimitMs,
  type OperationWaitClock,
} from './wait-clock';

type Expiration<Result> = {
  controller: AbortController;
  expired: () => Result;
};

// One HTTP invocation shares this deadline across validation and native work observation.
export class WaitBudget {
  private readonly began: number;
  private readonly clock: OperationWaitClock;
  public constructor(clock: OperationWaitClock = operationWaitClock) {
    this.clock = clock;
    this.began = clock.now();
  }
  public remaining(): number {
    return Math.max(0, operationWaitLimitMs - (this.clock.now() - this.began));
  }
  public guard<Result>(
    start: (signal: AbortSignal) => Promise<Result>,
    expired: () => Result = admissionTimedOut,
  ): Promise<Result> {
    if (this.remaining() === 0) return Promise.resolve().then(expired);
    const controller = new AbortController();
    const pending = Promise.withResolvers<Result>();

    const cancel = this.clock.schedule(
      () => expire(pending, { controller, expired }),
      this.remaining(),
    );

    const started = Promise.resolve().then(() => start(controller.signal));

    return Promise.race([started, pending.promise]).finally(cancel);
  }
}

function expire<Result>(
  pending: PromiseWithResolvers<Result>,
  { controller, expired }: Expiration<Result>,
): void {
  controller.abort();

  try {
    pending.resolve(expired());
  } catch (error) {
    pending.reject(error);
  }
}

export function admissionTimedOut(): never {
  throw new TRPCError({
    code: 'TIMEOUT',
    message: 'The Operation did not finish admission within ninety seconds',
  });
}
