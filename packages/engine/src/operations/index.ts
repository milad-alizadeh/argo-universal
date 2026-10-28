import { mergeRouters, router, routerFactory } from '../rpc';
import {
  createSessionList,
  createSessionRouter,
  createShellRouter,
} from '../sessions';
import { Operations, type OperationsDeps } from './operations';
import { createOperationsRouter } from './router';
import { generatedOperations } from './router.gen';

export { readControlToken } from './tokens';

export const createOperationRouters = routerFactory((deps: OperationsDeps) => {
  const sessionList = createSessionList(deps);
  const engine = new Operations(deps, sessionList);
  const generated = generatedOperations(engine);

  return router({
    ...generated,
    session: mergeRouters(
      createSessionRouter({ ...deps, sessionList }),
      generated.session,
    ),
    shell: mergeRouters(createShellRouter(deps), generated.shell),
    operations: createOperationsRouter(engine),
  });
});

export { SessionTokens } from './session-tokens';

export { sessionLaunchPolicy } from './session-launch';
