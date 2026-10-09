import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createMockAdapter } from '@repo/mocks/agent';
import { onTestFinished } from 'vitest';
import { type Actor, createActor, waitFor } from 'xstate';
import { createEngineContext, type Context } from '../src/engine/context';
import { appRouter } from '../src/engine/router';
import {
  agentCatalogId,
  catalogMachine,
  type CatalogInput,
} from '../src/services/agents';
import { databaseWriterId, writerMachine } from '../src/services/feed';
import {
  registryMachine,
  sessionRegistryId,
  type RegistryInput,
  type RegistryActorRef,
} from '../src/services/sessions';
import { openTestDatabase } from './database';

type RouterTestHostOptions = Partial<
  Omit<Parameters<typeof createEngineContext>[0], 'sessions'>
> &
  Partial<Pick<RegistryInput, 'adapters' | 'runtimeDirectory'>> &
  Pick<CatalogInput, 'registry' | 'platform'>;

export function startRouterTestHost(
  engineOptions: RouterTestHostOptions = {},
): {
  context: Context;
  caller: ReturnType<typeof appRouter.createCaller>;
  sessionRegistry: RegistryActorRef;
  databaseWriter: Actor<typeof writerMachine>;
} {
  const ownedDatabase = engineOptions.database ? undefined : openTestDatabase();
  const database = engineOptions.database ?? ownedDatabase?.database;
  if (!database) throw new Error('Test database is missing');
  const runtimeDirectory =
    engineOptions.runtimeDirectory ?? ownedDatabase?.directory ?? '/unused';
  const createId = engineOptions.createId ?? randomUUID;
  const sessionRegistry = createActor(registryMachine, {
    systemId: sessionRegistryId,
    input: {
      database,
      runtimeDirectory,
      createId,
      now: (): number => Date.now(),
      adapters: engineOptions.adapters ?? [createMockAdapter()],
    },
  }).start();
  startCatalogForTest(sessionRegistry, { ...engineOptions, runtimeDirectory });
  const databaseWriter = createActor(writerMachine, {
    parent: sessionRegistry,
    systemId: databaseWriterId,
    input: { database, now: (): number => Date.now() },
  }).start();
  onTestFinished(async (): Promise<void> => {
    if (sessionRegistry.getSnapshot().status === 'active') {
      sessionRegistry.send({ type: 'sessions.stopAll' });
      await waitFor(
        sessionRegistry,
        (snapshot): boolean => snapshot.status === 'done',
      );
    }
    if (databaseWriter.getSnapshot().status === 'active') {
      databaseWriter.send({ type: 'writer.drain' });
      await waitFor(
        databaseWriter,
        (snapshot): boolean => snapshot.status === 'done',
      );
    }
    ownedDatabase?.remove();
  });
  return routerTestHost(
    {
      ...engineOptions,
      database,
      sessions: sessionRegistry,
      createId,
      blobsFolder: engineOptions.blobsFolder ?? join(runtimeDirectory, 'blobs'),
      version: engineOptions.version ?? '1.2.3',
      startedAt: engineOptions.startedAt ?? '2026-10-03T00:00:00.000Z',
    },
    { sessionRegistry, databaseWriter },
  );
}

function routerTestHost(
  options: Parameters<typeof createEngineContext>[0],
  actors: {
    sessionRegistry: RegistryActorRef;
    databaseWriter: Actor<typeof writerMachine>;
  },
): ReturnType<typeof startRouterTestHost> {
  const context = createEngineContext(options);
  return { context, caller: appRouter.createCaller(context), ...actors };
}

const emptyRegistry = {
  readRegistry: async (): Promise<unknown> => ({
    version: '1.0.0',
    agents: [],
  }),
};

function startCatalogForTest(
  sessionRegistry: RegistryActorRef,
  engineOptions: CatalogInput,
): void {
  const catalog = createActor(catalogMachine, {
    parent: sessionRegistry,
    systemId: agentCatalogId,
    input: {
      runtimeDirectory: engineOptions.runtimeDirectory,
      registry: engineOptions.registry ?? emptyRegistry,
      platform: engineOptions.platform,
    },
  }).start();
  onTestFinished((): void => catalog.send({ type: 'catalog.stop' }));
}
