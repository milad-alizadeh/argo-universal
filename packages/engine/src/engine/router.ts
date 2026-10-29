import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { createFeedRouter } from '../feed';
import { createServerLinkPreviewRouter } from '../link-preview';
import { createNotificationsRouter } from '../notifications';
import { createOperationProcedures } from '../operations';
import { createPluginsRouter } from '../plugins';
import { mergeRouters, router, routerFactory } from '../rpc';
import {
  createSessionList,
  createSessionPorts,
  createSessionRouter,
  createShellRouter,
} from '../sessions';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
const createAppProcedures = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    linkPreview: createServerLinkPreviewRouter(deps),
    plugins: createPluginsRouter(deps.plugins),
    agents: createAgentsRouter(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
  }),
);

// Operations share the session and shell nouns with the Session procedures that are not Operations.
const createOperationRouters = routerFactory((deps: AppRouterDeps) => {
  const sessionList = createSessionList(deps);
  const sessionPorts = createSessionPorts(deps, sessionList);
  const operations = createOperationProcedures({ ...deps, sessionPorts });

  return router({
    ...operations,
    session: mergeRouters(
      createSessionRouter({ ...deps, sessionList }),
      operations.session,
    ),
    shell: mergeRouters(createShellRouter(deps), operations.shell),
  });
});

export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  mergeRouters(createAppProcedures(deps), createOperationRouters(deps)),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
