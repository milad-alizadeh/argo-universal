import { afterAll, expect, it } from 'vitest';
import {
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import { adjacencyMapToArray, getAdjacencyMap, TestModel } from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { registryMachine } from './registry-machine';
import { sessionListMachine } from './session-list-machine';

const { database, remove } = openTestDatabase();
afterAll(remove);
const sessions = createActor(registryMachine, {
  input: { database, adapters: [] },
});
const input = { sessions, writer: undefined, readRows: () => [] };
const machine = sessionListMachine.provide({
  actors: { observe: fromCallback(() => {}) },
});
type ListEvent = EventFromLogic<typeof machine>;
type ListSnapshot = SnapshotFrom<typeof machine>;
const events: ListEvent[] = [
  { type: 'list.refresh' },
  { type: 'list.failed', error: 'Unavailable database' },
  { type: 'list.stop' },
];
const key = (snapshot: ListSnapshot) => JSON.stringify(snapshot.value);
// xstate/graph's types do not carry emitted events.
const graphLogic = machine as unknown as ActorLogic<
  ListSnapshot,
  ListEvent,
  typeof input
>;
const model = new TestModel(graphLogic, {
  input,
  events,
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' && snapshot.can(event),
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
});
const paths = model.getShortestPaths();
it.each(paths.map((path, index) => [index, path] as const))(
  'walks list subscription model path %i',
  async (_, path) => {
    const actor = createActor(machine, { input }).start();
    try {
      await path.test({
        events: Object.fromEntries(
          events.map(({ type }) => [
            type,
            ({ event }: { event: AnyEventObject }) =>
              actor.send(event as ListEvent),
          ]),
        ),
        states: {
          '*': (expected) => {
            expect(key(actor.getSnapshot())).toBe(key(expected));
            expect(actor.getSnapshot().status).toBe(expected.status);
          },
        },
      });
    } finally {
      actor.stop();
    }
  },
);
it('the generated list subscription paths walk every transition', () => {
  const edge = (from: ListSnapshot, type: string, to: ListSnapshot) =>
    `${key(from)} ${type} ${key(to)}`;
  const transitions = adjacencyMapToArray(
    getAdjacencyMap(graphLogic, model.options),
  ).map(({ state, event, nextState }) => edge(state, event.type, nextState));
  const walked = new Set(
    paths.flatMap((path) =>
      path.steps
        .slice(1)
        .map((step, index) =>
          edge(
            path.steps[index]?.state ?? expect.unreachable(),
            step.event.type,
            step.state,
          ),
        ),
    ),
  );
  expect(transitions.length).toBeGreaterThan(0);
  expect(transitions.filter((transition) => !walked.has(transition))).toEqual(
    [],
  );
});
it('ends a subscription with the projection error when the stored data cannot be read', () => {
  const error = new Error('Unrecognised Session row');
  const actor = createActor(machine, {
    input: {
      ...input,
      readRows: () => {
        throw error;
      },
    },
  }).start();
  expect(actor.getSnapshot()).toMatchObject({
    value: 'failed',
    status: 'done',
    context: { failure: error },
  });
  actor.stop();
});
