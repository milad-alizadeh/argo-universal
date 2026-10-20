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

const refreshRegistry = async (
  deps: RegistryDeps,
): Promise<ReturnType<typeof readRegistry>> => {
  await requestRegistry(deps.registry, 'REFRESH');

  return readRegistry(deps.database, deps.registry.getSnapshot().context.error);
};

/*
 * What a surface asks for when it opens: the Registry fetches again only once an hour, and answers from
 * the Server's cache the rest of the time. Refreshing on every open spent a CDN round trip, and its 30
 * second timeout, on a document that changes far more slowly than a reader opens the page.
 */
const syncRegistry = async (
  deps: RegistryDeps,
): Promise<ReturnType<typeof readRegistry>> => {
  await requestRegistry(deps.registry, 'STALE');

  return readRegistry(deps.database, deps.registry.getSnapshot().context.error);
};
