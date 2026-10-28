import { SessionArchiveInput, SessionArchiveOutput } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import { archiveSession } from './archive-commands';

export const createArchiveRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    archive: publicProcedure
      .input(SessionArchiveInput)
      .output(SessionArchiveOutput)
      .mutation(({ input }) => archiveSession(deps, input.sessionId)),
  }),
);
