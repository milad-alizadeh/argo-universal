import { createRunner } from './create-runner';
import { Operations, type OperationsDeps } from './operations';
import { createOperationsRouter } from './router';
import { generatedOperations } from './router.gen';

export { ensureControlToken } from './tokens';

export type { OperationsDeps } from './operations';

type OperationProcedures = ReturnType<typeof generatedOperations> & {
  operations: ReturnType<typeof createOperationsRouter>;
};

// Every Operation's procedures, by noun, and the token callers' operations router; the Engine mounts them.
export function createOperationProcedures(
  deps: OperationsDeps,
): OperationProcedures {
  const runner = createRunner(deps);

  return {
    ...generatedOperations(runner),
    operations: createOperationsRouter(new Operations(deps, runner)),
  };
}

export { SessionTokens } from './session-tokens';

export type { OperationWaitClock } from './work';

export { sessionLaunchPolicy } from './session-launch';
