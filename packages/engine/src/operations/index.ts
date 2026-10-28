import { mergeRouters, router, routerFactory } from '../rpc';
import { createSessionRouter, createShellRouter } from '../sessions';
import { Operations, type OperationsDeps } from './operations';
import { createOperationsRouter } from './router';
import { generatedOperations } from './router.gen';

export { readControlToken } from './tokens';

export const createOperationRouters = routerFactory((deps: OperationsDeps) => {
  const engine = new Operations(deps);
  const generated = generatedOperations(engine);

  return router({
    ...generated,
    session: mergeRouters(createSessionRouter(deps), generated.session),
    shell: mergeRouters(createShellRouter(deps), generated.shell),
    operations: createOperationsRouter(engine),
  });
});
