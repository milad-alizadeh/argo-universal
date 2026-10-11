import { router, routerFactory } from '../rpc';
import { createAgentsRouter } from '../services/agents';
import { createBlobRouter } from '../services/blob';
import { createFeedRouter } from '../services/feed';
import { createProjectsRouter } from '../services/projects';
import { createSessionRouter } from '../services/sessions';
import { createSystemRouter } from '../services/system';
import type { AppRouterDeps } from './router-deps';

// Each router takes only the slice of the Engine's dependencies its type names.
export const createAppRouter = routerFactory((deps: AppRouterDeps) =>
  router({
    blob: createBlobRouter(deps),
    agents: createAgentsRouter(deps),
    projects: createProjectsRouter(deps),
    system: createSystemRouter(deps),
    feed: createFeedRouter(deps),
    session: createSessionRouter(deps),
  }),
);
export type AppRouter = ReturnType<typeof createAppRouter>;
