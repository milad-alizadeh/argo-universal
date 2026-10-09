import { onTestFinished } from 'vitest';
import { type Actor, waitFor } from 'xstate';
import {
  shutdownCatalogSyncSupervisor,
  type CatalogSyncSupervisor,
} from '../src/services/agents';
import { type writerMachine } from '../src/services/feed';
import { type RegistryActorRef } from '../src/services/sessions';
import type { openTestDatabase } from './database';

type RouterActors = {
  catalogSync: CatalogSyncSupervisor;
  sessionRegistry: RegistryActorRef;
  databaseWriter: Actor<typeof writerMachine>;
};
const isDone = (snapshot: { status: string }): boolean =>
  snapshot.status === 'done';

export function registerRouterStop(
  actors: RouterActors,
  ownedDatabase: ReturnType<typeof openTestDatabase> | undefined,
): () => Promise<void> {
  const stop = async (): Promise<void> => {
    await shutdownCatalogSyncSupervisor(actors.catalogSync);
    await stopRouterActors(actors);
    if (ownedDatabase?.database.$client.isOpen) ownedDatabase.remove();
  };
  onTestFinished(stop);
  return stop;
}

async function stopRouterActors(actors: RouterActors): Promise<void> {
  if (actors.sessionRegistry.getSnapshot().status === 'active') {
    actors.sessionRegistry.send({ type: 'sessions.stopAll' });
    await waitFor(actors.sessionRegistry, isDone);
  }
  if (actors.databaseWriter.getSnapshot().status === 'active') {
    actors.databaseWriter.send({ type: 'writer.drain' });
    await waitFor(actors.databaseWriter, isDone);
  }
}
