import { Operations, type OperationsDeps } from './operations';
import { createOperationsRouter } from './router';
import { generatedOperations } from './router.gen';

export { readControlToken } from './tokens';

type OperationRouters = ReturnType<typeof generatedOperations> & {
  operations: ReturnType<typeof createOperationsRouter>;
};

export function createOperationRouters(deps: OperationsDeps): OperationRouters {
  const engine = new Operations(deps);

  return {
    ...generatedOperations(engine),
    operations: createOperationsRouter(engine),
  };
}
