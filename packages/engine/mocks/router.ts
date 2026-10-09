import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createMockAdapter } from '@repo/mocks/agent';
import { type Actor, createActor } from 'xstate';
import { createEngineContext, type Context } from '../src/engine/context';
import { appRouter } from '../src/engine/router';
import { databaseWriterId, writerMachine } from '../src/services/feed';
import {
  registryMachine,
  sessionRegistryId,
  type RegistryInput,
  type RegistryActorRef,
} from '../src/services/sessions';
import { openTestDatabase } from './database';
import { registerRouterStop } from './router-stop';

type RouterTestHostOptions = Partial<
  Omit<Parameters<typeof createEngineContext>[0], 'sessions'>
> &
  Partial<
    Pick<
      RegistryInput,
      'adapters' | 'runtimeDirectory' | 'acpResources' | 'resolveAgentLaunch'
    >
  >;

export function startRouterTestHost(
  engineOptions: RouterTestHostOptions = {},
): {
  context: Context;
  caller: ReturnType<typeof appRouter.createCaller>;
  sessionRegistry: RegistryActorRef;
  databaseWriter: Actor<typeof writerMachine>;
  stop(): Promise<void>;
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
      acpResources: engineOptions.acpResources,
      resolveAgentLaunch: engineOptions.resolveAgentLaunch,
    },
  }).start();
  const databaseWriter = createActor(writerMachine, {
    parent: sessionRegistry,
    systemId: databaseWriterId,
    input: { database, now: (): number => Date.now() },
  }).start();
  return createRouterTestHost(
    {
      ...engineOptions,
      fetchAgents: engineOptions.fetchAgents ?? fetchEmptyAgents,
      database,
      sessions: sessionRegistry,
      createId,
      blobsFolder: engineOptions.blobsFolder ?? join(runtimeDirectory, 'blobs'),
      version: engineOptions.version ?? '1.2.3',
      startedAt: engineOptions.startedAt ?? '2026-10-03T00:00:00.000Z',
    },
    { sessionRegistry, databaseWriter },
    ownedDatabase,
  );
}

function createRouterTestHost(
  options: Parameters<typeof createEngineContext>[0],
  actors: {
    sessionRegistry: RegistryActorRef;
    databaseWriter: Actor<typeof writerMachine>;
  },
  ownedDatabase: ReturnType<typeof openTestDatabase> | undefined,
): ReturnType<typeof startRouterTestHost> {
  const context = createEngineContext(options);
  const stop = registerRouterStop(
    { ...actors, catalogSync: context.catalogSync },
    ownedDatabase,
  );
  return { context, caller: appRouter.createCaller(context), ...actors, stop };
}

const fetchEmptyAgents = async (): Promise<unknown> => ({
  version: '1.0.0',
  agents: [],
});
