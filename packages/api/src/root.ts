import { systemRouter } from './system/router';
import { router } from './trpc';

export const appRouter = router({ system: systemRouter });
export type AppRouter = typeof appRouter;

export type { Services } from './services';
export type { SystemService } from './system/service';
