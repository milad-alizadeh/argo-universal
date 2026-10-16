import { RegistryAgentId } from '@repo/contracts';
import type { Database } from '@repo/db';
import { publicProcedure, router, routerFactory } from '../../rpc';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import {
  AgentServerChangeJob,
  readAgentServers,
} from '../servers/agent-servers-sql';
import { readRegistry } from './registry-cache';
import { requestRegistry, type RegistryActor } from './registry-machine';

export type RegistryDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  registry: RegistryActor;
  dropAgentConnections: (id: string) => void;
};

const changeAgentServer = async (
  deps: RegistryDeps,
  id: string,
  operation: 'add' | 'remove',
): Promise<void> => {
  await writeDatabaseJobAndWaitForCommit(
    deps.databaseWriter,
    new AgentServerChangeJob(id, operation),
    true,
  );
  deps.dropAgentConnections(id);
};

export const createRegistryRouter = routerFactory((deps: RegistryDeps) =>
  router({
    remove: publicProcedure
      .input(RegistryAgentId)
      .mutation(({ input }) => changeAgentServer(deps, input.id, 'remove')),
    registry: publicProcedure.query(() =>
      readRegistry(deps.database, deps.registry.getSnapshot().context.error),
    ),
    refreshRegistry: publicProcedure.mutation(() => refreshRegistry(deps)),
    servers: publicProcedure.query(() => readAgentServers(deps.database)),
    addRegistry: publicProcedure
      .input(RegistryAgentId)
      .mutation(({ input }) => changeAgentServer(deps, input.id, 'add')),
  }),
);

const refreshRegistry = async (
  deps: RegistryDeps,
): Promise<ReturnType<typeof readRegistry>> => {
  await requestRegistry(deps.registry, 'REFRESH');

  return readRegistry(deps.database, deps.registry.getSnapshot().context.error);
};
