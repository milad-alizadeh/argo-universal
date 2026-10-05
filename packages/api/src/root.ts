import { feedRouter } from './feed/router';
import { sessionRouter } from './sessions/router';
import { systemRouter } from './system/router';
import { router } from './trpc';

export const appRouter = router({
  system: systemRouter,
  feed: feedRouter,
  session: sessionRouter,
});
export type AppRouter = typeof appRouter;

export type { FeedService } from './feed/service';
export type { Services } from './services';
export type { SessionService } from './sessions/service';
export type { SystemService } from './system/service';
