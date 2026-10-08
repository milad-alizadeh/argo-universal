import { agentsRouter } from '../services/agents';
import { blobRouter } from '../services/blob';
import { feedRouter } from '../services/feed';
import { projectsRouter } from '../services/projects';
import { sessionRouter } from '../services/sessions';
import { systemRouter } from '../services/system';
import { router } from './trpc';

export const appRouter = router({
  blob: blobRouter,
  agents: agentsRouter,
  projects: projectsRouter,
  system: systemRouter,
  feed: feedRouter,
  session: sessionRouter,
});
export type AppRouter = typeof appRouter;
