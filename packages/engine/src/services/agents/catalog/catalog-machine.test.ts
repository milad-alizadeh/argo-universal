import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise, type SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type AdjacencyMap,
  type GraphEventFromLogic,
} from 'xstate/graph';
import type { RegistrySnapshot } from './cache';
import { catalogMachine } from './catalog-machine';

const empty: RegistrySnapshot = {
  registry: null,
  fetchedAt: null,
  error: null,
};
const fresh: RegistrySnapshot = {
  registry: publishedRegistry,
  fetchedAt: '2026-10-09T12:00:00.000Z',
  error: null,
};
const input = { runtimeDirectory: '/unused', platform: 'darwin-aarch64' };
let hydration = Promise.withResolvers<RegistrySnapshot>();
let refresh = Promise.withResolvers<RegistrySnapshot>();
const machine = catalogMachine.provide({
  actors: {
    hydrate: fromPromise((): Promise<RegistrySnapshot> => {
      hydration = Promise.withResolvers<RegistrySnapshot>();
      return hydration.promise;
    }),
    refresh: fromPromise((): Promise<RegistrySnapshot> => {
      refresh = Promise.withResolvers<RegistrySnapshot>();
      return refresh.promise;
    }),
  },
});
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
  const actor = createActor(machine, { input }).start();
  try {
    for (const step of path.steps) {
      await actModelEvent(step.event, actor);
      expect(key(actor.getSnapshot())).toBe(key(step.state));
    }
  } finally {
    actor.stop();
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
): Promise<void> {
  if (isControlEvent(event)) {
    actor.send(event);
    return;
  }
  if (event.type === doneHydrate) hydration.resolve(event.output);
  else await settleRefresh(event);
  await vi.advanceTimersByTimeAsync(0);
}

async function settleRefresh(
  event: Exclude<CatalogEvent, ControlEvent | { type: typeof doneHydrate }>,
): Promise<void> {
  if (event.type === doneRefresh) refresh.resolve(event.output);
  else if (event.type === 'xstate.error.actor.refresh')
    refresh.reject(event.error);
  else await vi.advanceTimersByTimeAsync(20_000);
}

function isControlEvent(event: CatalogEvent): event is ControlEvent {
  return event.type === 'catalog.refresh' || event.type === 'catalog.stop';
}
