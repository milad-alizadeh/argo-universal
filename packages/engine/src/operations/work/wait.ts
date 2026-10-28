import { createActor, toPromise, type ActorOptions } from 'xstate';
import type { OperationWaitClock } from './clock';
import {
  operationWaitMachine,
  type WaitInput,
  type WaitOutcome,
} from './wait.machine';

type MachineClock = ActorOptions<typeof operationWaitMachine>['clock'];

// Runs one wait actor to its outcome; a failure is an outcome, so a caller that has left leaves no rejection unhandled.
export function waitForWork(
  input: WaitInput,
  clock: OperationWaitClock,
): Promise<WaitOutcome> {
  const actor = createActor(operationWaitMachine, {
    input,
    clock: machineClock(clock),
  });

  const outcome = toPromise(actor);
  actor.start();

  return outcome;
}

// XState schedules the `after` deadline on the Operation wait clock.
function machineClock(clock: OperationWaitClock): MachineClock {
  return {
    setTimeout: (callback, milliseconds) =>
      clock.schedule(callback, milliseconds),
    clearTimeout: (cancel: () => void) => cancel(),
  };
}
