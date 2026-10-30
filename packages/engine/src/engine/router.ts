import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { createDevicesRouter } from '../devices';
import { createFeedRouter } from '../feed';
import { createServerLinkPreviewRouter } from '../link-preview';
import { createNotificationsRouter } from '../notifications';
import { createOperationProcedures } from '../operations';
import { createPluginsRouter } from '../plugins';
import { mergeRouters, router, routerFactory } from '../rpc';
import { createShellRouter, Sessions } from '../sessions';
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
    devices: createDevicesRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
  }),
);

// Operations share the session and shell nouns with the Session procedures that are not Operations.
const createOperationRouters = routerFactory((deps: AppRouterDeps) => {
  const sessions = new Sessions(deps);
  const operations = createOperationProcedures({ ...deps, sessions });

  return router({
    ...operations,
    session: mergeRouters(sessions.router, operations.session),
    shell: mergeRouters(createShellRouter(deps), operations.shell),
  });
});

export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  mergeRouters(createAppProcedures(deps), createOperationRouters(deps)),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
