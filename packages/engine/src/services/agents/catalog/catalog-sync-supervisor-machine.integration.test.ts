import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';
import {
  createCatalogSupervisorModel,
  serializeCatalogSupervisorState,
  serializeCatalogSupervisorEvent,
  type SupervisorModelEvent,
} from '#mocks/catalog-supervisor-model';
import { openTestDatabase } from '#mocks/database';
import { createControllableRegistry } from '#mocks/registry-port';
import { catalogSyncSupervisorMachine } from './catalog-sync-supervisor-machine';
import { createRegistryReader } from './registry-reader';

const modeledDatabase = openTestDatabase();
afterAll(modeledDatabase.remove);
afterEach(() => vi.useRealTimers());
const model = createCatalogSupervisorModel(modeledDatabase.database);

it.each(model.paths.map((path, index) => [index, path] as const))(
  'walks catalog supervisor path %i with the real Registry port and SQLite',
  async (_, path): Promise<void> => {
    vi.useFakeTimers();
    const stored = openTestDatabase();
    const registry = createControllableRegistry();
    const actor = createActor(catalogSyncSupervisorMachine, {
      input: {
        database: stored.database,
        reader: createRegistryReader(),
        fetchAgents: registry.fetchAgents,
        platform: 'darwin-aarch64',
        now: Date.now,
      },
    });
    const observed: string[] = [];
    actor.subscribe((snapshot) =>
      observed.push(serializeCatalogSupervisorState(snapshot)),
    );
    actor.start();
    try {
      for (const [index, step] of path.steps.entries()) {
        if (!index) continue;
        await advanceCatalogSupervisorModelStep(
          step.event,
          { actor, registry, database: stored.database },
          path.steps.slice(index + 1),
        );
        expect(observed).toContain(serializeCatalogSupervisorState(step.state));
      }
      expect(serializeCatalogSupervisorState(actor.getSnapshot())).toBe(
        serializeCatalogSupervisorState(path.state),
      );
    } finally {
      actor.stop();
      stored.remove();
    }
  },
);

it('walks every catalog supervisor transition and both completion outcomes', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths: model.paths,
      stateKey: serializeCatalogSupervisorState,
      eventKey: serializeCatalogSupervisorEvent,
    }),
  ).toEqual([]);
});

type SupervisorActor = ReturnType<
  typeof createActor<typeof catalogSyncSupervisorMachine>
>;
type ControlledRegistry = ReturnType<typeof createControllableRegistry>;
interface CatalogSupervisorTestScope {
  actor: SupervisorActor;
  registry: ControlledRegistry;
  database: ReturnType<typeof openTestDatabase>['database'];
}
type RemainingSteps = (typeof model.paths)[number]['steps'];

async function advanceCatalogSupervisorModelStep(
  event: SupervisorModelEvent,
  testScope: CatalogSupervisorTestScope,
  remainingSteps: RemainingSteps,
): Promise<void> {
  const { actor, registry } = testScope;
  if (event.type === 'xstate.done.actor.catalogWorker')
    settleRegistryFetchForSupervisorModelStep(event, actor, registry);
  else
    requestSupervisorTransitionForModelStep(event, testScope, remainingSteps);
  await vi.advanceTimersByTimeAsync(0);
}

function settleRegistryFetchForSupervisorModelStep(
  event: Extract<
    SupervisorModelEvent,
    { type: 'xstate.done.actor.catalogWorker' }
  >,
  actor: SupervisorActor,
  registry: ControlledRegistry,
): void {
  if (actor.getSnapshot().status !== 'active') return;
  if (event.output.error) registry.reject(new Error(event.output.error));
  else registry.resolve(publishedRegistry);
}

function requestSupervisorTransitionForModelStep(
  event: Exclude<
    SupervisorModelEvent,
    { type: 'xstate.done.actor.catalogWorker' }
  >,
  testScope: CatalogSupervisorTestScope,
  remainingSteps: RemainingSteps,
): void {
  const { actor, registry, database } = testScope;
  if (
    event.type === 'catalog.shutdown' &&
    willCatalogWriteCompleteAfterShutdown(remainingSteps)
  ) {
    requestSupervisorShutdownFromCatalogInsert(actor, registry, database);
  } else actor.send(event);
}

function willCatalogWriteCompleteAfterShutdown(
  remainingSteps: RemainingSteps,
): boolean {
  return remainingSteps.some(
    ({ event }) =>
      event.type === 'xstate.done.actor.catalogWorker' &&
      event.output.error === null,
  );
}

function requestSupervisorShutdownFromCatalogInsert(
  actor: SupervisorActor,
  registry: ControlledRegistry,
  database: ReturnType<typeof openTestDatabase>['database'],
): void {
  database.$client.function('request_catalog_shutdown', () => {
    actor.send({ type: 'catalog.shutdown' });
    return 0;
  });
  database.$client.exec(
    'CREATE TEMP TRIGGER shutdown_catalog BEFORE INSERT ON agents BEGIN SELECT request_catalog_shutdown(); END',
  );
  registry.resolve(publishedRegistry);
}
