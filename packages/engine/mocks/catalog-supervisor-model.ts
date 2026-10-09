import type { Database } from '@repo/db';
import { terminalPaths } from '@repo/vitest/model-paths';
import { createActor, type SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
  type StatePath,
  type AdjacencyMap,
} from 'xstate/graph';
import {
  createRegistryReader,
  syncSupervisorMachine,
} from '../src/services/agents';
import { writerMachine } from '../src/services/feed';

type SupervisorSnapshot = SnapshotFrom<typeof syncSupervisorMachine>;
const synchronized = 'xstate.done.actor.synchronize';
export const supervisorEvents = [
  {
    type: 'sync.request',
    admitted: { resolve: (): void => {}, reject: (): void => {} },
  },
  { type: 'sync.stop' },
  {
    type: 'xstate.done.actor.schedule',
    actorId: 'schedule',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.schedule',
    actorId: 'schedule',
    error: new Error('Scheduling failed'),
  },
  { type: 'xstate.done.actor.start', actorId: 'start', output: undefined },
  {
    type: 'xstate.error.actor.start',
    actorId: 'start',
    error: new Error('Starting failed'),
  },
  {
    type: synchronized,
    actorId: 'synchronize',
    output: {
      job: {
        type: 'agentCatalogReplace',
        source: 'agent-catalog',
        scope: 'default',
        rows: [],
        syncedAt: 1,
        rejectedValues: 0,
      },
    },
  },
  {
    type: synchronized,
    actorId: 'synchronize',
    output: {
      error: 'Registry is offline',
      retryable: true,
      rejectedValues: 0,
    },
  },
  {
    type: synchronized,
    actorId: 'synchronize',
    output: {
      error: 'Registry is invalid',
      retryable: false,
      rejectedValues: 1,
    },
  },
  {
    type: 'xstate.error.actor.synchronize',
    actorId: 'synchronize',
    error: new Error('Sync failed'),
  },
  { type: 'xstate.done.actor.save', actorId: 'save', output: undefined },
  {
    type: 'xstate.error.actor.save',
    actorId: 'save',
    error: new Error('Saving failed'),
  },
  { type: 'xstate.after.fetchLimit.syncSupervisor.syncing' },
  { type: 'xstate.after.retryDelay.syncSupervisor.waiting' },
] satisfies GraphEventFromLogic<typeof syncSupervisorMachine>[];
export type SupervisorModelEvent = (typeof supervisorEvents)[number];

export function serializeCatalogSupervisorState(
  snapshot: SupervisorSnapshot,
): string {
  return JSON.stringify({
    state: snapshot.value,
    admissions: snapshot.context.admissions.length,
    attempts: snapshot.context.attempts,
    retryable:
      snapshot.context.result !== null &&
      'retryable' in snapshot.context.result &&
      snapshot.context.result.retryable,
  });
}

export function serializeCatalogSupervisorEvent(
  event: SupervisorModelEvent,
): string {
  return event.type === synchronized
    ? `${event.type}:${'job' in event.output ? 'success' : event.output.retryable}`
    : event.type;
}

export function createCatalogSupervisorModel(database: Database): {
  paths: StatePath<SupervisorSnapshot, SupervisorModelEvent>[];
  getAdjacencyMap(): AdjacencyMap<SupervisorSnapshot, SupervisorModelEvent>;
} {
  const options = {
    input: {
      database,
      reader: createRegistryReader(),
      now: Date.now,
      writer: createActor(writerMachine, {
        input: { database, now: Date.now },
      }),
      fetchAgents: async (): Promise<never> => new Promise(() => {}),
    },
    events: supervisorEvents,
    filterEvents: canApplyCatalogSupervisorModelEvent,
    serializeState: serializeCatalogSupervisorPathState,
  };
  return {
    paths: terminalPaths(getShortestPaths(syncSupervisorMachine, options)),
    getAdjacencyMap: () => getAdjacencyMap(syncSupervisorMachine, options),
  };
}

function serializeCatalogSupervisorPathState(
  snapshot: SupervisorSnapshot,
  event: SupervisorModelEvent | undefined,
  previous?: SupervisorSnapshot,
): string {
  return JSON.stringify({
    state: serializeCatalogSupervisorState(snapshot),
    via:
      event &&
      `${previous && serializeCatalogSupervisorState(previous)} ${serializeCatalogSupervisorEvent(event)}`,
  });
}

function canApplyCatalogSupervisorModelEvent(
  snapshot: SupervisorSnapshot,
  event: SupervisorModelEvent,
): boolean {
  if (snapshot.status !== 'active') return false;
  if (event.type === 'sync.request')
    return snapshot.context.admissions.length < 2 && snapshot.can(event);
  if (event.type.endsWith('schedule')) return snapshot.matches('scheduling');
  if (event.type.endsWith('start')) return snapshot.matches('starting');
  if (event.type.endsWith('synchronize') || event.type.includes('fetchLimit'))
    return snapshot.matches('syncing');
  if (event.type.endsWith('save')) return snapshot.matches('saving');
  if (event.type.includes('retryDelay')) return snapshot.matches('waiting');
  return event.type === 'sync.stop' && snapshot.can(event);
}
