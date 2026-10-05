import { agentsRouter } from './agents/router';
import { blobRouter } from './blob/router';
import { feedRouter } from './feed/router';
import { projectsRouter } from './projects/router';
import { sessionRouter } from './sessions/router';
import { systemRouter } from './system/router';
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

export type { AgentsService } from './agents/service';
export type { BlobService } from './blob/service';
export type { FeedService } from './feed/service';
export type { ProjectsService } from './projects/service';
export type { Services } from './services';
export type { SessionService } from './sessions/service';
export type { SystemService } from './system/service';
