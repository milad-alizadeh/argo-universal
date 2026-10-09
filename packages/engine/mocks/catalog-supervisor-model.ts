import type { Database } from '@repo/db';
import { terminalPaths } from '@repo/vitest/model-paths';
import { createActor, type SnapshotFrom } from 'xstate';
import { getAdjacencyMap, getShortestPaths, type GraphEventFromLogic } from 'xstate/graph';
import { createRegistryReader, syncSupervisorMachine } from '../src/services/agents';
import { writerMachine } from '../src/services/feed';

type SupervisorSnapshot = SnapshotFrom<typeof syncSupervisorMachine>;
export const supervisorEvents = [
  { type: 'catalog.requested', requestId: 'request' },
  { type: 'catalog.shutdown' },
  { type: 'xstate.done.actor.recoverCatalogRequests', actorId: 'recoverCatalogRequests', output: undefined },
  { type: 'xstate.error.actor.recoverCatalogRequests', actorId: 'recoverCatalogRequests', error: new Error('Recovery rejected') },
  { type: 'xstate.done.actor.cleanAbandonedRequests', actorId: 'cleanAbandonedRequests', output: undefined },
  { type: 'xstate.error.actor.cleanAbandonedRequests', actorId: 'cleanAbandonedRequests', error: new Error('Interruption rejected') },
  { type: 'xstate.done.actor.catalogJoins', actorId: 'catalogJoins', output: undefined },
  { type: 'xstate.error.actor.catalogJoins', actorId: 'catalogJoins', error: new Error('Join rejected') },
  { type: 'xstate.done.actor.catalogWorker', actorId: 'catalogWorker', output: { changedIds: [], error: null, abandoned: false } },
  { type: 'xstate.done.actor.catalogWorker', actorId: 'catalogWorker', output: { changedIds: [], error: 'Storage failed', abandoned: true } },
  { type: 'xstate.done.actor.interruptPendingRequests', actorId: 'interruptPendingRequests', output: undefined },
  { type: 'xstate.error.actor.interruptPendingRequests', actorId: 'interruptPendingRequests', error: new Error('Shutdown interruption rejected') },
] satisfies GraphEventFromLogic<typeof syncSupervisorMachine>[];
export type SupervisorModelEvent = (typeof supervisorEvents)[number];

export function serializeCatalogSupervisorState(snapshot: SupervisorSnapshot): string {
  return JSON.stringify({ state: snapshot.value, joins: snapshot.context.joinRequestIds.length,
    joining: snapshot.context.joinBatchSize > 0, abandoned: snapshot.context.abandonedSyncIds.length > 0,
    requested: snapshot.context.syncId !== '' });
}

export function serializeCatalogSupervisorEvent(event: SupervisorModelEvent): string {
  return event.type === 'xstate.done.actor.catalogWorker' ? `${event.type}:${event.output.abandoned}` : event.type;
}

export function createCatalogSupervisorModel(database: Database) {
  const options = { input: { database, reader: createRegistryReader(), now: Date.now,
    writer: createActor(writerMachine, { input: { database, now: Date.now } }),
    fetchAgents: async (): Promise<never> => new Promise(() => {}) },
    events: supervisorEvents, filterEvents: canApplyCatalogSupervisorModelEvent,
    serializeState: serializeCatalogSupervisorPathState };
  return { paths: terminalPaths(getShortestPaths(syncSupervisorMachine, options)),
    getAdjacencyMap: () => getAdjacencyMap(syncSupervisorMachine, options) };
}

function serializeCatalogSupervisorPathState(snapshot: SupervisorSnapshot,
  event: SupervisorModelEvent | undefined, previous?: SupervisorSnapshot): string {
  return JSON.stringify({ state: serializeCatalogSupervisorState(snapshot),
    via: event && `${previous && serializeCatalogSupervisorState(previous)} ${serializeCatalogSupervisorEvent(event)}` });
}

function canApplyCatalogSupervisorModelEvent(snapshot: SupervisorSnapshot, event: SupervisorModelEvent): boolean {
  if (snapshot.status !== 'active') return false;
  if (event.type === 'catalog.requested') return snapshot.context.joinRequestIds.length < 2 && snapshot.can(event);
  if (event.type.endsWith('catalogJoins')) return snapshot.context.joinBatchSize > 0;
  if (event.type.endsWith('catalogWorker')) return snapshot.matches('syncing') || snapshot.matches('stoppingWorker');
  if (event.type.endsWith('recoverCatalogRequests')) return snapshot.matches('recovering');
  if (event.type.endsWith('cleanAbandonedRequests')) return snapshot.matches('cleaningAbandoned');
  if (event.type.endsWith('interruptPendingRequests')) return snapshot.matches('interruptingShutdown');
  return snapshot.can(event);
}
