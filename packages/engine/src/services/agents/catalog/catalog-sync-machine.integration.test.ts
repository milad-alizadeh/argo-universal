import { agents } from '@repo/db/schema';
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
import { catalogSyncMachine } from './catalog-sync-machine';
import { createRegistryReader } from './registry';

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
    prepareCatalogSyncWriteFailure(stored.database, path);
    const actor = createActor(catalogSyncMachine, {
      input: {
        database: stored.database,
        registry: registry.port,
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
        await applyExternalRegistryEvent(step.event, actor, registry);
        expect(observed).toContain(serializeCatalogSyncState(step.state));
      }
      expect(serializeCatalogSyncState(actor.getSnapshot())).toBe(
        serializeCatalogSyncState(path.state),
      );
      expect(stored.database.select().from(agents).all()).toHaveLength(
        actor.getSnapshot().matches('succeeded') ? 4 : 0,
      );
    } finally {
      actor.stop();
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

async function applyExternalRegistryEvent(
  event: CatalogSyncModelEvent,
  actor: ReturnType<typeof createActor<typeof catalogSyncMachine>>,
  registry: ReturnType<typeof createControllableRegistry>,
): Promise<void> {
  if (event.type === 'catalog.cancel') actor.send(event);
  else await settleExternalRegistryEvent(event, registry);
  await vi.advanceTimersByTimeAsync(0);
}

async function settleExternalRegistryEvent(
  event: Exclude<CatalogSyncModelEvent, { type: 'catalog.cancel' }>,
  registry: ReturnType<typeof createControllableRegistry>,
): Promise<void> {
  if (event.type === 'xstate.done.actor.fetchCatalog')
    registry.resolve(publishedRegistry);
  else if (event.type === 'xstate.error.actor.fetchCatalog')
    registry.reject(event.error);
  else await advanceExternalRegistryTimeout(event);
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
}

async function advanceExternalRegistryTimeout(
  event: CatalogSyncModelEvent,
): Promise<void> {
  if (event.type.startsWith('xstate.after'))
    await vi.advanceTimersByTimeAsync(20_000);
}
