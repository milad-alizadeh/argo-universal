import { routerFactory } from '../rpc';
import { createAgentsRouter } from '../services/agents';
import { createBlobRouter } from '../services/blob';
import { createFeedRouter } from '../services/feed';
import { createProjectsRouter } from '../services/projects';
import { createSessionRouter } from '../services/sessions';
import { createSystemRouter } from '../services/system';
import type { AppRouterDeps } from './router-deps';

export const createAppRouter = routerFactory((deps: AppRouterDeps) => ({
  blob: createBlobRouter(deps),
  agents: createAgentsRouter(deps),
  projects: createProjectsRouter(deps.database),
  system: createSystemRouter(deps),
  feed: createFeedRouter(deps.feed),
  session: createSessionRouter(deps),
}));
export type AppRouter = ReturnType<typeof createAppRouter>;
