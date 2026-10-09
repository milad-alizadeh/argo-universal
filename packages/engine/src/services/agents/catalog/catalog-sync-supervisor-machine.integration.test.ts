import { agentCatalogSyncRequest } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createCatalogSupervisorModel, serializeCatalogSupervisorState, serializeCatalogSupervisorEvent } from '#mocks/catalog-supervisor-model';
import { createCatalogSupervisorTestHost } from '#mocks/catalog-supervisor-host';
import { openTestDatabase } from '#mocks/database';
import { createControllableRegistry } from '#mocks/registry-port';

const modeled = openTestDatabase();
modeled.database.insert(agentCatalogSyncRequest).values({ requestId: 'unfinished', syncId: 'unfinished', status: 'pending', requestedAt: 1 }).run();
afterAll(modeled.remove);
afterEach(() => vi.useRealTimers());
const model = createCatalogSupervisorModel(modeled.database);
type SupervisorPath = (typeof model.paths)[number];

it.each(model.paths.map((path, index) => [index, path] as const))(
  'walks sync supervisor path %i with SQL requests, real Writer and the external Registry port',
  async (_, path): Promise<void> => {
    vi.useFakeTimers();
    const stored = openTestDatabase();
    stored.database.insert(agentCatalogSyncRequest).values({ requestId: 'unfinished', syncId: 'unfinished', status: 'pending', requestedAt: 1 }).run();
    const registry = createControllableRegistry();
    const host = createCatalogSupervisorTestHost(stored.database, registry.fetchAgents);
    let cursor = 0;
    installCatalogModelSqlFailures(stored.database, path, () => cursor);
    const observed: string[] = [];
    const subscription = host.supervisor.subscribe((snapshot) => {
      observed.push(serializeCatalogSupervisorState(snapshot));
      const step = path.steps[cursor];
      if (!step || serializeCatalogSupervisorState(step.state) !== serializeCatalogSupervisorState(snapshot)) return;
      cursor += 1;
      dispatchCatalogModelPublicOperation(path.steps[cursor]?.event, host, registry);
    });
    host.supervisor.start();
    try {
      await vi.waitFor(() => expect(cursor).toBe(path.steps.length));
      expect(observed).toContain(serializeCatalogSupervisorState(path.state));
    } finally { subscription.unsubscribe(); host.stop(); stored.remove(); }
  },
);

it('walks every sync supervisor graph transition including SQL failure and shutdown branches', (): void => {
  expect(unwalkedTransitions({ models: [model], paths: model.paths,
    stateKey: serializeCatalogSupervisorState, eventKey: serializeCatalogSupervisorEvent })).toEqual([]);
});

function dispatchCatalogModelPublicOperation(event: SupervisorPath['steps'][number]['event'] | undefined,
  host: ReturnType<typeof createCatalogSupervisorTestHost>, registry: ReturnType<typeof createControllableRegistry>): void {
  if (!event) return;
  if (event.type === 'catalog.requested') void host.requestSync().catch(() => {});
  else if (event.type === 'catalog.shutdown') host.supervisor.send(event);
  else if (event.type === 'xstate.done.actor.catalogWorker') {
    if (event.output.abandoned) registry.reject(new Error('Registry is offline'));
    else registry.resolve(publishedRegistry);
  }
}

function installCatalogModelSqlFailures(database: typeof modeled.database, path: SupervisorPath, cursor: () => number): void {
  database.$client.function('reject_catalog_model_write', (status: string, joining: number) => {
    const remaining = path.steps.slice(cursor()).map(({ event }) => event);
    if (joining) return Number(nextCatalogModelEvent(remaining, 'catalogJoins')?.type.startsWith('xstate.error'));
    if (status === 'failed') return Number(nextCatalogModelEvent(remaining, 'catalogWorker')?.output?.abandoned);
    if (status !== 'interrupted') return 0;
    return Number(remaining.find((event) => /recoverCatalogRequests|cleanAbandonedRequests|interruptPendingRequests/.test(event.type))?.type.startsWith('xstate.error'));
  });
  database.$client.exec("CREATE TEMP TRIGGER reject_model_write BEFORE UPDATE ON agent_catalog_sync_request WHEN reject_catalog_model_write(NEW.status, NEW.sync_id <> OLD.sync_id) BEGIN SELECT RAISE(ABORT, 'model SQL rejection'); END");
}

function nextCatalogModelEvent(events: SupervisorPath['steps'][number]['event'][], actorId: string) {
  return events.find((event) => event.type.endsWith(actorId));
}
