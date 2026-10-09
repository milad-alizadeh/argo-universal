import { onTestFinished } from 'vitest';
import { type Actor, type ActorRefFrom, waitFor } from 'xstate';
import {
  syncSupervisorMachine,
} from '../src/services/agents';
import { type writerMachine } from '../src/services/feed';
import { type RegistryActorRef } from '../src/services/sessions';
import type { openTestDatabase } from './database';

type RouterActors = {
  syncSupervisor: ActorRefFrom<typeof syncSupervisorMachine>;
  commandAdmission: AbortController;
  unsubscribe(): void;
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
    actors.commandAdmission.abort();
    if (actors.syncSupervisor.getSnapshot().status === 'active') {
      actors.syncSupervisor.send({ type: 'catalog.shutdown' });
      await waitFor(actors.syncSupervisor, (snapshot) => snapshot.status !== 'active');
    }
    actors.unsubscribe();
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
