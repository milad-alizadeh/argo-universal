import type { OperationRunResult } from '../implementations';
import type { WorkObservation } from './observation';
import type {
  Admitted,
  WaitOutcome,
  WaitStart,
  WorkAdmission,
} from './wait.machine';

// A user who waits follows the wait id its admission returned; any other answer returns at once.
export function admittedStart(
  start: (admission: WorkAdmission) => Promise<OperationRunResult>,
  wait: boolean,
): WaitStart {
  return {
    kind: 'admit',
    admit: async (admission) => admittedAnswer(await start(admission), wait),
  };
}

function admittedAnswer(result: OperationRunResult, wait: boolean): Admitted {
  return wait && result.kind === 'operation_execution'
    ? { kind: 'observe', id: result.id }
    : { kind: 'answer', answer: result };
}

export function answered(outcome: WaitOutcome): OperationRunResult {
  if (outcome.kind === 'answer') return outcome.answer;

  return observed(outcome).execution;
}

// Observing work that already has a wait id admits nothing, so its outcome is an observation or a failure.
export function observed(outcome: WaitOutcome): WorkObservation {
  if (outcome.kind === 'observation') return outcome.observation;

  throw outcome.kind === 'failure' ? outcome.failure : unobserved();
}

const unobserved = (): Error =>
  new Error('An Operation wait answered without observing its work');
