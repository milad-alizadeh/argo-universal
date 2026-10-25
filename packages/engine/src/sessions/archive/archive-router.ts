import {
  SessionArchiveInput,
  SessionArchiveOutput,
  SessionUnarchiveInput,
  SessionUnarchiveOutput,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import { archiveSession, unarchiveSession } from './archive-commands';

export const createArchiveRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    archive: publicProcedure
      .input(SessionArchiveInput)
      .output(SessionArchiveOutput)
      .mutation(({ input }) => archiveSession(deps, input.sessionId)),
    unarchive: publicProcedure
      .input(SessionUnarchiveInput)
      .output(SessionUnarchiveOutput)
      .mutation(({ input }) => unarchiveSession(deps, input.sessionId)),
  }),
);
