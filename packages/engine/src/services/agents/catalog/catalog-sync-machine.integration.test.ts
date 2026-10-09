import { agents, agentCatalogSyncRequest } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import {
  createCatalogSyncModel,
  serializeCatalogSyncState,
  type CatalogSyncModelEvent,
} from '#mocks/catalog-sync-model';
import { openTestDatabase } from '#mocks/database';
import { createControllableRegistry } from '#mocks/registry-port';
import { writerMachine } from '../../feed';
import { catalogSyncMachine } from './catalog-sync-machine';
import { createRegistryReader } from './registry-reader';

const modeledDatabase = openTestDatabase();
afterAll(modeledDatabase.remove);
afterEach(() => vi.useRealTimers());
const model = createCatalogSyncModel(modeledDatabase.database);

it.each(model.paths.map((path, index) => [index, path] as const))(
  'walks finite sync path %i through the Registry port and actual SQLite',
  async (_, path): Promise<void> => {
    vi.useFakeTimers();
    const stored = openTestDatabase();
    const registry = createControllableRegistry();
    stored.database.insert(agentCatalogSyncRequest).values({ requestId: 'modeled-request', syncId: 'modeled-request', status: 'pending', requestedAt: Date.now() }).run();
    prepareCatalogSyncWriteFailure(stored.database, path);
    const writer = createActor(writerMachine, { input: { database: stored.database, now: Date.now } }).start();
    const actor = createActor(catalogSyncMachine, {
      input: {
        database: stored.database,
        writer, syncId: 'modeled-request', now: Date.now,
        fetchAgents: registry.fetchAgents,
        reader: createRegistryReader(),
      },
    });
    const observed: string[] = [];
    actor.subscribe((snapshot) =>
      observed.push(serializeCatalogSyncState(snapshot)),
    );
    actor.start();
    try {
      for (const step of path.steps.slice(1)) {
        await advanceCatalogSyncModelStep(step.event, actor, registry);
        expect(observed).toContain(serializeCatalogSyncState(step.state));
      }
      expect(observed).toContain(serializeCatalogSyncState(path.state));
      expect(stored.database.select().from(agents).all()).toHaveLength(
        actor.getSnapshot().matches('succeeded') ? 4 : 0,
      );
    } finally {
      actor.stop();
      writer.stop();
      stored.remove();
    }
  },
);

it('walks every finite sync transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths: model.paths,
      stateKey: serializeCatalogSyncState,
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
});

async function advanceCatalogSyncModelStep(
  modelEvent: CatalogSyncModelEvent,
  actor: ReturnType<typeof createActor<typeof catalogSyncMachine>>,
  registry: ReturnType<typeof createControllableRegistry>,
): Promise<void> {
  if (modelEvent.type === 'catalog.cancel') actor.send(modelEvent);
  else await settleRegistryFetchForModelStep(modelEvent, registry);
  await vi.advanceTimersByTimeAsync(0);
}

async function settleRegistryFetchForModelStep(
  modelEvent: Exclude<CatalogSyncModelEvent, { type: 'catalog.cancel' }>,
  registry: ReturnType<typeof createControllableRegistry>,
): Promise<void> {
  if (modelEvent.type === 'xstate.done.actor.fetchCatalog')
    registry.resolve(publishedRegistry);
  else if (modelEvent.type === 'xstate.error.actor.fetchCatalog')
    registry.reject(modelEvent.error);
  else await advanceExternalRegistryTimeout(modelEvent);
}

function prepareCatalogSyncWriteFailure(
  database: ReturnType<typeof openTestDatabase>['database'],
  path: (typeof model.paths)[number],
): void {
  if (
    path.steps.some(
      ({ event }) => event.type === 'xstate.error.actor.saveCatalog',
    )
  )
    database.$client.exec(
      "CREATE TRIGGER reject_sync BEFORE INSERT ON agents BEGIN SELECT RAISE(ABORT, 'database rejected catalog'); END",
    );
  if (path.steps.some(({ event }) => event.type === 'xstate.error.actor.recordFailedSync'))
    database.$client.exec("CREATE TRIGGER reject_status BEFORE UPDATE ON agent_catalog_sync_request BEGIN SELECT RAISE(ABORT, 'status rejected'); END");
}

async function advanceExternalRegistryTimeout(
  modelEvent: CatalogSyncModelEvent,
): Promise<void> {
  if (modelEvent.type.startsWith('xstate.after'))
    await vi.advanceTimersByTimeAsync(20_000);
}
