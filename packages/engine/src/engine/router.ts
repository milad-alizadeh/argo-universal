import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { createFeedRouter } from '../feed';
import { createServerLinkPreviewRouter } from '../link-preview';
import { createNotificationsRouter } from '../notifications';
import { createOperationRouters } from '../operations';
import { createPluginsRouter } from '../plugins';
import { createProjectsRouter } from '../projects';
import { router, routerFactory } from '../rpc';
import { createSessionRouter, createShellRouter } from '../sessions';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    linkPreview: createServerLinkPreviewRouter(deps),
    plugins: createPluginsRouter(deps.plugins),
    agents: createAgentsRouter(deps),
    projects: createProjectsRouter(deps),
    ...createOperationRouters(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    notifications: createNotificationsRouter(deps),
    session: createSessionRouter(deps),
    shell: createShellRouter(deps),
  }),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
