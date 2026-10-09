import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { createActor } from 'xstate';
import { createRegistryReader, requestAgentCatalogSync, syncSupervisorMachine, type FetchAgents } from '../src/services/agents';
import { writerMachine } from '../src/services/feed';
import { registryMachine } from '../src/services/sessions';

export function createCatalogSupervisorTestHost(database: Database, fetchAgents: FetchAgents) {
  const sessions = createActor(registryMachine, { input: { database, adapters: [],
    runtimeDirectory: '/unused', now: Date.now, createId: randomUUID } }).start();
  const writer = createActor(writerMachine, { parent: sessions, input: { database, now: Date.now } }).start();
  const reader = createRegistryReader();
  const supervisor = createActor(syncSupervisorMachine, { parent: sessions,
    input: { database, writer, reader, fetchAgents, now: Date.now } });
  const subscription = writer.on('catalog.sqlCommitted', ({ commits }) => {
    for (const requestId of commits.flatMap((commit) => commit.requestedIds))
      supervisor.send({ type: 'catalog.requested', requestId });
  });
  return { supervisor, writer, requestSync: () => requestAgentCatalogSync({ database, writer, reader, requestId: randomUUID() }),
    stop: () => { subscription.unsubscribe(); supervisor.stop(); writer.stop(); sessions.stop(); } };
}
