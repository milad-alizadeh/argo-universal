import { OperationExecution } from '@repo/contracts/operations';
import type { OperationRunResult } from '../implementations';
import type { WorkObservation } from './observation';
import type { StartOperation } from './response';
import type {
  Admitted,
  WaitOutcome,
  WaitStart,
  WorkAdmission,
} from './wait.machine';

// A Session caller's Operation is observed through its Tool call, so no deadline admits its start.
export const unadmitted: WorkAdmission = {
  signal: new AbortController().signal,
  started: () => {},
};

// A user who waits follows the wait id its admission returned; any other result answers at once.
export function userAdmission(start: StartOperation, wait: boolean): WaitStart {
  return {
    kind: 'admit',
    admit: async (admission) =>
      admittedResult(await start(admission).result, wait),
  };
}

function admittedResult(result: OperationRunResult, wait: boolean): Admitted {
  const execution = executionOf(result);

  return wait && execution
    ? { kind: 'observe', id: execution.id }
    : { kind: 'answer', answer: result };
}

// Native work answers with its execution; every other answer is the Operation's own result.
export function executionOf(
  result: OperationRunResult,
): OperationExecution | undefined {
  const execution = OperationExecution.safeParse(result);

  return execution.success ? execution.data : undefined;
}

export function answered(outcome: WaitOutcome): OperationRunResult {
  if (outcome.kind === 'answer') return outcome.answer;

  return observed(outcome).execution;
}

// Observing work that already has a wait id admits nothing, so its outcome is an observation or a failure.
export function observed(outcome: WaitOutcome): WorkObservation {
  switch (outcome.kind) {
    case 'observation':
      return outcome.observation;
    case 'failure':
      throw outcome.failure;
    case 'answer':
      throw new Error('An Operation wait answered without observing its work');
  }
}
