import { RegistryAgentId } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../../rpc';
import { readAgentServers } from '../servers/agent-servers-sql';
import { readRegistry } from './registry-cache';
import {
  changeAgentServer,
  refreshRegistry,
  syncRegistry,
  type RegistryDeps,
} from './registry-operations';

export const createRegistryRouter = routerFactory((deps: RegistryDeps) =>
  router({
    registry: publicProcedure.query(() =>
      readRegistry(deps.database, deps.registry.getSnapshot().context.error),
    ),
    refreshRegistry: publicProcedure.mutation(() => refreshRegistry(deps)),
    syncRegistry: publicProcedure.mutation(() => syncRegistry(deps)),
    servers: publicProcedure.query(() => readAgentServers(deps.database)),
    remove: publicProcedure
      .input(RegistryAgentId)
      .mutation(({ input }) => changeAgentServer(deps, input.id, 'remove')),
    addRegistry: publicProcedure
      .input(RegistryAgentId)
      .mutation(({ input }) => changeAgentServer(deps, input.id, 'add')),
  }),
);
