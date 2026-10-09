import type { Database } from '@repo/db';
import { terminalPaths } from '@repo/vitest/model-paths';
import type { SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
  type StatePath,
  type AdjacencyMap,
} from 'xstate/graph';
import {
  createRegistryReader,
  catalogSyncSupervisorMachine,
} from '../src/services/agents';

type SupervisorSnapshot = SnapshotFrom<typeof catalogSyncSupervisorMachine>;
const workerDone = 'xstate.done.actor.catalogWorker';
const supervisorEvents = [
  { type: 'catalog.sync' },
  { type: 'catalog.shutdown' },
  {
    type: workerDone,
    actorId: 'catalogWorker',
    output: { changedIds: [], error: null },
  },
  {
    type: workerDone,
    actorId: 'catalogWorker',
    output: { changedIds: [], error: 'Registry is offline' },
  },
] satisfies GraphEventFromLogic<typeof catalogSyncSupervisorMachine>[];
export type SupervisorModelEvent = (typeof supervisorEvents)[number];

export function serializeCatalogSupervisorState(
  snapshot: SupervisorSnapshot,
): string {
  return JSON.stringify(snapshot.value);
}

export function serializeCatalogSupervisorEvent(
  event: SupervisorModelEvent,
): string {
  return event.type === workerDone
    ? `${event.type}:${event.output.error}`
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
      platform: 'darwin-aarch64',
      now: Date.now,
      fetchAgents: async (): Promise<never> => new Promise(() => {}),
    },
    events: supervisorEvents,
    filterEvents: canApplyCatalogSupervisorModelEvent,
    serializeState: serializeCatalogSupervisorPathState,
  };
  return {
    paths: terminalPaths(
      getShortestPaths(catalogSyncSupervisorMachine, options),
    ),
    getAdjacencyMap: (): AdjacencyMap<
      SupervisorSnapshot,
      SupervisorModelEvent
    > => getAdjacencyMap(catalogSyncSupervisorMachine, options),
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
  if (event.type === 'catalog.sync') return !snapshot.matches('stopping');
  return snapshot.can(event);
}
