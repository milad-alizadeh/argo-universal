import type { Database } from '@repo/db';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import { AgentServerChangeJob } from '../servers/agent-servers-sql';
import { readRegistry } from './registry-cache';
import { requestRegistry, type RegistryActor } from './registry-machine';

export type RegistryDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  registry: RegistryActor;
  dropAgentConnections: (id: string) => void;
};

// The connections drop only once the change is committed, so none reopens against the old choice.
export const changeAgentServer = async (
  deps: Pick<RegistryDeps, 'databaseWriter' | 'dropAgentConnections'>,
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

export const refreshRegistry = async (
  deps: Pick<RegistryDeps, 'database' | 'registry'>,
): Promise<ReturnType<typeof readRegistry>> => {
  await requestRegistry(deps.registry, 'REFRESH');

  return readRegistry(deps.database, deps.registry.getSnapshot().context.error);
};

/*
 * What a surface asks for when it opens: the Registry fetches again only once an hour, and answers from
 * the Server's cache the rest of the time. Refreshing on every open spent a CDN round trip, and its 30
 * second timeout, on a document that changes far more slowly than a reader opens the page.
 */
export const syncRegistry = async (
  deps: Pick<RegistryDeps, 'database' | 'registry'>,
): Promise<ReturnType<typeof readRegistry>> => {
  await requestRegistry(deps.registry, 'STALE');

  return readRegistry(deps.database, deps.registry.getSnapshot().context.error);
};
