import { feedRouter } from './feed/router';
import { systemRouter } from './system/router';
import { router } from './trpc';

export const appRouter = router({ system: systemRouter, feed: feedRouter });
export type AppRouter = typeof appRouter;

export type { FeedService } from './feed/service';
export type { Services } from './services';
export type { SystemService } from './system/service';
