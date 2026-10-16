import { createAgentsRouter } from '../agents';
import { createBlobRouter } from '../blob';
import { createFeedRouter } from '../feed';
import { createPluginsRouter } from '../plugins';
import { createProjectsRouter } from '../projects';
import { router, routerFactory } from '../rpc';
import { createSessionRouter, shellRouter } from '../sessions';
import { createSystemRouter } from '../system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    plugins: createPluginsRouter(deps),
    agents: createAgentsRouter(deps),
    projects: createProjectsRouter(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    session: createSessionRouter(deps),
    shell: shellRouter,
  }),
);

export type AppRouter = ReturnType<typeof createAppRouter>;
