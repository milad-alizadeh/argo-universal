import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, expect, it } from 'vitest';
import { createActor, type SnapshotFrom } from 'xstate';
import {
  getAdjacencyMap,
  getShortestPaths,
  type GraphEventFromLogic,
  type StatePath,
  type AdjacencyMap,
} from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { writerMachine } from '../../storage';
import { registryMachine } from './registry-machine';

const stored = openTestDatabase();

const empty = openTestDatabase();

empty.database.$client.exec('DELETE FROM registry_cache');

afterAll(() => {
  stored.remove();
  empty.remove();
});

type RegistrySnapshot = SnapshotFrom<typeof registryMachine>;

const events = [
  { type: 'REFRESH' },
  { type: 'STALE' },
  { type: 'STOP' },
  {
    type: 'xstate.done.actor.fetchRegistry',
    actorId: 'fetchRegistry',
    output: { version: '1.0.0', agents: [] },
  },
  {
    type: 'xstate.error.actor.fetchRegistry',
    actorId: 'fetchRegistry',
    error: new Error('offline'),
  },
  { type: 'xstate.after.fetchLimit.registry.fetching' },
  {
    type: 'xstate.done.actor.saveRegistry',
    actorId: 'saveRegistry',
    output: undefined,
  },
  {
    type: 'xstate.error.actor.saveRegistry',
    actorId: 'saveRegistry',
    error: new Error('storage'),
  },
] satisfies GraphEventFromLogic<typeof registryMachine>[];

type GraphEvent = (typeof events)[number];

const stateKey = (snapshot: RegistrySnapshot): string =>
  JSON.stringify({
    state: snapshot.value,
    attempted: snapshot.context.lastAttemptAt !== null,
    error: snapshot.context.error,
  });

const eventKey = (event: GraphEvent): string => event.type;

const canApply = (snapshot: RegistrySnapshot, event: GraphEvent): boolean => {
  if (isFetchEvent(event)) return snapshot.matches('fetching');

  if (event.type.endsWith('saveRegistry')) return snapshot.matches('saving');

  return publicEventAllowed(snapshot, event);
};

const filterEvents = (snapshot: RegistrySnapshot, event: GraphEvent): boolean =>
  snapshot.status === 'active' && canApply(snapshot, event);

type Model = {
  paths: StatePath<RegistrySnapshot, GraphEvent>[];
  getAdjacencyMap: () => AdjacencyMap<RegistrySnapshot, GraphEvent>;
};

const models = [stored, empty].map(({ database }): Model => {
  const options = {
    input: {
      database,
      writer: createActor(writerMachine, {
        input: { database, now: (): number => 0 },
      }),
      now: (): number => 0,
    },
    events,
    filterEvents,
    serializeState: (
      snapshot: RegistrySnapshot,
      event?: GraphEvent,
      previous?: RegistrySnapshot,
    ): string =>
      JSON.stringify({
        state: stateKey(snapshot),
        via: event && `${previous && stateKey(previous)} ${event.type}`,
      }),
  };

  return {
    paths: getShortestPaths(registryMachine, options),
    getAdjacencyMap: (): AdjacencyMap<RegistrySnapshot, GraphEvent> =>
      getAdjacencyMap(registryMachine, options),
  };
});

it('structurally walks Registry fetch, save, failure, timeout, throttle and STOP transitions', () => {
  expect(
    unwalkedTransitions({
      models,
      paths: models.flatMap(({ paths }) => paths),
      stateKey,
      eventKey,
    }),
  ).toEqual([]);
});

const isPublic = (
  event: GraphEvent,
): event is Extract<GraphEvent, { type: 'REFRESH' | 'STALE' | 'STOP' }> =>
  ['REFRESH', 'STALE', 'STOP'].includes(event.type);

const isFetchEvent = (event: GraphEvent): boolean =>
  event.type.endsWith('fetchRegistry') || event.type.includes('fetchLimit');

const publicEventAllowed = (
  snapshot: RegistrySnapshot,
  event: GraphEvent,
): boolean => isPublic(event) && snapshot.can(event);
