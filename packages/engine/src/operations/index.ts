import { mergeRouters, router, routerFactory } from '../rpc';
import {
  createSessionList,
  createSessionRouter,
  createShellRouter,
} from '../sessions';
import { createRunner, Operations, type OperationsDeps } from './operations';
import { createOperationsRouter } from './router';
import { generatedOperations } from './router.gen';

export { ensureControlToken } from './tokens';

export const createOperationRouters = routerFactory((deps: OperationsDeps) => {
  const sessionList = createSessionList(deps);
  const runner = createRunner(deps, sessionList);
  const engine = new Operations(deps, runner);
  const generated = generatedOperations(runner);

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

export type { OperationWaitClock } from './work';

export { sessionLaunchPolicy } from './session-launch';
