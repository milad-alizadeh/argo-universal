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
    admit: async (admission) =>
      admittedResult(await start(admission).result, wait),
  };
}

function admittedResult(result: OperationRunResult, wait: boolean): Admitted {
  const execution = executionOf(result);

  return wait && execution ? { observe: execution.id } : { answer: result };
}

// Native work answers with its execution; every other answer is the Operation's own result.
export function executionOf(
  result: OperationRunResult,
): OperationExecution | undefined {
  const execution = OperationExecution.safeParse(result);

  return execution.success ? execution.data : undefined;
}

export function answered(outcome: WaitOutcome): OperationRunResult {
  if ('answer' in outcome) return outcome.answer;

  return observed(outcome).execution;
}

export function observed(outcome: WaitOutcome): WorkObservation {
  if ('failure' in outcome) throw outcome.failure;

  if ('observation' in outcome) return outcome.observation;

  throw new Error('An Operation wait answered without observing its work');
}
