import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { createFeedRouter } from '../feed';
import { createServerLinkPreviewRouter } from '../link-preview';
import { createNotificationsRouter } from '../notifications';
import { createOperationRouters } from '../operations';
import { createPluginsRouter } from '../plugins';
import { createProjectsRouter } from '../projects';
import { mergeRouters, router, routerFactory } from '../rpc';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
const createAppProcedures = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    linkPreview: createServerLinkPreviewRouter(deps),
    plugins: createPluginsRouter(deps.plugins),
    agents: createAgentsRouter(deps),
    projects: createProjectsRouter(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
  }),
);

export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  mergeRouters(createAppProcedures(deps), createOperationRouters(deps)),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
