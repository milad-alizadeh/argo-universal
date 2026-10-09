import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { createActor, type SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type AdjacencyMap,
  type GraphEventFromLogic,
} from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { controllableRegistry } from '#mocks/registry-port';
import type { RegistrySnapshot } from './cache';
import { catalogMachine } from './catalog-machine';

const empty: RegistrySnapshot = {
  registry: null,
  fetchedAt: null,
  error: null,
};
const fresh: RegistrySnapshot = {
  registry: publishedRegistry,
  fetchedAt: 1791547200000,
  error: null,
};
const modeledDatabase = openTestDatabase();
const input = {
  database: modeledDatabase.database,
  platform: 'darwin-aarch64',
};
const machine = catalogMachine;
afterAll(modeledDatabase.remove);
type CatalogSnapshot = SnapshotFrom<typeof machine>;
const doneRefresh = 'xstate.done.actor.refresh';
const doneHydrate = 'xstate.done.actor.hydrate';
const events = [
  { type: 'catalog.refresh' },
  { type: 'catalog.stop' },
  { type: doneHydrate, actorId: 'hydrate', output: empty },
  { type: doneRefresh, actorId: 'refresh', output: fresh },
  {
    type: 'xstate.error.actor.refresh',
    actorId: 'refresh',
    error: new Error('Registry is offline'),
  },
  { type: 'xstate.after.refreshTimeout.agentCatalog.refreshing' },
] satisfies GraphEventFromLogic<typeof machine>[];
type CatalogEvent = (typeof events)[number];
type ControlEvent = { type: 'catalog.refresh' } | { type: 'catalog.stop' };
const key = (snapshot: CatalogSnapshot): string =>
  JSON.stringify({
    value: snapshot.value,
    registry: snapshot.context.registry?.version,
    error: snapshot.context.error,
  });

function relevantEvent(
  snapshot: CatalogSnapshot,
  event: CatalogEvent,
): boolean {
  if (snapshot.status !== 'active') return false;
  if (isControlEvent(event)) return snapshot.can(event);
  return invocationCanComplete(snapshot, event);
}

function invocationCanComplete(
  snapshot: CatalogSnapshot,
  event: CatalogEvent,
): boolean {
  return event.type === doneHydrate
    ? snapshot.matches('hydrating')
    : snapshot.matches('refreshing');
}

const options = {
  input,
  events,
  filterEvents: relevantEvent,
  serializeState: (
    snapshot: CatalogSnapshot,
    event: CatalogEvent | undefined,
    previous?: CatalogSnapshot,
  ): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};
const paths = terminalPaths(getShortestPaths(machine, options));
afterEach((): import('vitest').VitestUtils => vi.useRealTimers());

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks catalog model path %i', async (_, path): Promise<void> => {
  vi.useFakeTimers();
  const stored = openTestDatabase();
  const registry = controllableRegistry();
  const actor = createActor(machine, {
    input: { ...input, database: stored.database, registry: registry.port },
  }).start();
  try {
    for (const [index, step] of path.steps.entries()) {
      if (index > 0) await actModelEvent(step.event, actor, registry);
      expect(key(actor.getSnapshot())).toBe(key(step.state));
    }
  } finally {
    actor.stop();
    stored.remove();
  }
});

it('walks every catalog transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<CatalogSnapshot, CatalogEvent> =>
            getAdjacencyMap(machine, options),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event): string => event.type,
    }),
  ).toEqual([]);
});

async function actModelEvent(
  event: CatalogEvent,
  actor: ReturnType<typeof createActor<typeof machine>>,
  registry: ReturnType<typeof controllableRegistry>,
): Promise<void> {
  if (isControlEvent(event)) {
    actor.send(event);
    return;
  }
  if (event.type !== doneHydrate) await settleRefresh(event, registry);
  await vi.advanceTimersByTimeAsync(0);
}

async function settleRefresh(
  event: Exclude<CatalogEvent, ControlEvent | { type: typeof doneHydrate }>,
  registry: ReturnType<typeof controllableRegistry>,
): Promise<void> {
  if (event.type === doneRefresh) registry.resolve(event.output.registry);
  else if (event.type === 'xstate.error.actor.refresh')
    registry.reject(event.error);
  else await vi.advanceTimersByTimeAsync(20_000);
}

function isControlEvent(event: CatalogEvent): event is ControlEvent {
  return event.type === 'catalog.refresh' || event.type === 'catalog.stop';
}
