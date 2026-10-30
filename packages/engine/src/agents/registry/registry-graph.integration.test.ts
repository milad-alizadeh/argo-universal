import {
  type Arrival,
  type ModelFixture,
  type Vertex,
  walkGraph,
} from '@repo/vitest/model-test';
import { afterAll, expect, it } from 'vitest';
import { createActor, type InputFrom, type SnapshotFrom } from 'xstate';
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
] satisfies ModelFixture<typeof registryMachine>[];

type GraphEvent = (typeof events)[number];

const vertex = (snapshot: RegistrySnapshot): Vertex => ({
  state: snapshot.value,
  attempted: snapshot.context.lastAttemptAt !== null,
  error: snapshot.context.error,
});

const stateKey = (snapshot: RegistrySnapshot): string =>
  JSON.stringify(vertex(snapshot));

const canApply = (snapshot: RegistrySnapshot, event: GraphEvent): boolean => {
  if (isFetchEvent(event)) return snapshot.matches('fetching');

  if (event.type.endsWith('saveRegistry')) return snapshot.matches('saving');

  return publicEventAllowed(snapshot, event);
};

const isPublic = (
  event: GraphEvent,
): event is Extract<GraphEvent, { type: 'REFRESH' | 'STALE' | 'STOP' }> =>
  ['REFRESH', 'STALE', 'STOP'].includes(event.type);

const isFetchEvent = (event: GraphEvent): boolean =>
  event.type.endsWith('fetchRegistry');

const publicEventAllowed = (
  snapshot: RegistrySnapshot,
  event: GraphEvent,
): boolean => isPublic(event) && snapshot.can(event);

const inputOf = ({
  database,
}: typeof stored): InputFrom<typeof registryMachine> => ({
  database,
  writer: createActor(writerMachine, {
    input: { database, now: (): number => 0 },
  }),
  now: (): number => 0,
});

// The vertex the step came from, so each way into a vertex is its own.
const cameFrom: Arrival<typeof registryMachine, GraphEvent> = (
  _,
  event,
  previous,
): string => `${stateKey(previous)} ${event.type}`;

const walk = { search: 'shortest', prefixes: true, arrival: cameFrom } as const;

// One walk from a stored Registry and one from an empty cache; coverage is over both.
const { unwalked } = walkGraph(registryMachine, {
  input: inputOf(stored),
  fixtures: events,
  vertex,
  stateKey,
  accepts: canApply,
  walks: [
    { name: 'stored', ...walk },
    { name: 'empty', input: inputOf(empty), ...walk },
  ],
});

it('structurally walks Registry fetch, save, failure, timeout, throttle and STOP transitions', () => {
  expect(unwalked()).toEqual([]);
});
