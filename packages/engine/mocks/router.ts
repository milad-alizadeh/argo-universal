import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createMockAdapter } from '@repo/mocks/agent';
import { onTestFinished } from 'vitest';
import { type Actor, createActor, waitFor } from 'xstate';
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

type RouterHostOptions = Partial<
  Omit<Parameters<typeof createEngineContext>[0], 'sessions'>
> &
  Partial<Pick<RegistryInput, 'adapters' | 'runtimeDirectory'>>;

export function createRouterHost(options: RouterHostOptions = {}): {
  context: Context;
  caller: ReturnType<typeof appRouter.createCaller>;
  root: RegistryActorRef;
  writer: Actor<typeof writerMachine>;
} {
  const owned = options.database ? undefined : openTestDatabase();
  const database = options.database ?? owned?.database;
  if (!database) throw new Error('Test database is missing');
  const runtimeDirectory =
    options.runtimeDirectory ?? owned?.directory ?? '/unused';
  const createId = options.createId ?? randomUUID;
  const root = createActor(registryMachine, {
    systemId: sessionRegistryId,
    input: {
      database,
      runtimeDirectory,
      createId,
      now: (): number => Date.now(),
      adapters: options.adapters ?? [createMockAdapter()],
    },
  }).start();
  const writer = createActor(writerMachine, {
    parent: root,
    systemId: databaseWriterId,
    input: { database, now: (): number => Date.now() },
  }).start();
  onTestFinished(async (): Promise<void> => {
    writer.send({ type: 'writer.drain' });
    await waitFor(writer, (snapshot): boolean => snapshot.status === 'done');
    root.stop();
    owned?.remove();
  });
  const context = createEngineContext({
    ...options,
    database,
    sessions: root,
    createId,
    blobsFolder: options.blobsFolder ?? join(runtimeDirectory, 'blobs'),
    version: options.version ?? '1.2.3',
    startedAt: options.startedAt ?? '2026-10-03T00:00:00.000Z',
  });
  return { context, caller: appRouter.createCaller(context), root, writer };
}
