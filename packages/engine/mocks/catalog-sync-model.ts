import type { Database } from '@repo/db';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { terminalPaths } from '@repo/vitest/model-paths';
import type { SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type AdjacencyMap,
  type StatePath,
  type GraphEventFromLogic,
} from 'xstate/graph';
import {
  catalogSyncMachine,
  createRegistryReader,
} from '../src/services/agents';

export const catalogSyncEvents = [
  { type: 'catalog.cancel' },
  {
    type: 'xstate.done.actor.fetchCatalog',
    actorId: 'fetchCatalog',
    output: publishedRegistry,
  },
  { type: 'xstate.done.actor.saveCatalog', actorId: 'saveCatalog', output: [] },
  {
    type: 'xstate.error.actor.fetchCatalog',
    actorId: 'fetchCatalog',
    error: new Error('Registry is offline'),
  },
  {
    type: 'xstate.error.actor.saveCatalog',
    actorId: 'saveCatalog',
    error: new Error('Database rejected catalog'),
  },
  { type: 'xstate.after.fetchLimit.catalogSync.fetching' },
] satisfies GraphEventFromLogic<typeof catalogSyncMachine>[];
export type CatalogSyncModelEvent = (typeof catalogSyncEvents)[number];
type CatalogSnapshot = SnapshotFrom<typeof catalogSyncMachine>;

export function serializeCatalogSyncState(snapshot: CatalogSnapshot): string {
  return JSON.stringify(snapshot.value);
}

function canApplyCatalogSyncModelEvent(
  snapshot: CatalogSnapshot,
  event: CatalogSyncModelEvent,
): boolean {
  if (snapshot.status !== 'active') return false;
  const saving = event.type.endsWith('saveCatalog');
  return snapshot.matches(saving ? 'saving' : 'fetching');
}

export function createCatalogSyncModel(database: Database): {
  paths: StatePath<CatalogSnapshot, CatalogSyncModelEvent>[];
  getAdjacencyMap: () => AdjacencyMap<CatalogSnapshot, CatalogSyncModelEvent>;
} {
  const input = {
    database,
    reader: createRegistryReader(),
    registry: {
      readRegistry: async (): Promise<never> => new Promise(() => {}),
    },
  };
  const options = {
    input,
    events: catalogSyncEvents,
    filterEvents: canApplyCatalogSyncModelEvent,
    serializeState: serializeCatalogSyncPathState,
  };
  return {
    paths: terminalPaths(getShortestPaths(catalogSyncMachine, options)),
    getAdjacencyMap: () => getAdjacencyMap(catalogSyncMachine, options),
  };
}

function serializeCatalogSyncPathState(
  snapshot: CatalogSnapshot,
  event: CatalogSyncModelEvent | undefined,
  previous?: CatalogSnapshot,
): string {
  return JSON.stringify({
    state: serializeCatalogSyncState(snapshot),
    via:
      event &&
      `${previous && serializeCatalogSyncState(previous)} ${event.type}`,
  });
}
