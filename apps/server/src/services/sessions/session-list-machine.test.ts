import { randomUUID } from 'node:crypto';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, expect, it } from 'vitest';
import {
  type ActorLogic,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  SimulatedClock,
  type SnapshotFrom,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { registryMachine } from './registry-machine';
import { sessionListMachine } from './session-list-machine';

const { database, directory: runtimeDirectory, remove } = openTestDatabase();
afterAll(remove);
const sessions = createActor(registryMachine, {
  input: {
    now: (): number => Date.now(),
    createId: randomUUID,
    database,
    runtimeDirectory,
    adapters: [],
  },
});
const input = {
  sessions,
  writer: undefined,
  readRows: (): never[] => [],
  sessionIdsForJobs: (): never[] => [],
  relatedSessionIds: (ids: readonly string[]): string[] => [...ids],
};
const machine = sessionListMachine.provide({
  actors: { observe: fromCallback((): void => {}) },
});
type ListEvent = EventFromLogic<typeof machine>;
type ListSnapshot = SnapshotFrom<typeof machine>;
// The model drives the pending state's named delay event as well as public events.
const events = [
  { type: 'list.refresh' },
  { type: 'list.failed', error: 'Unavailable database' },
  { type: 'list.stop' },
  { type: 'list.flush' },
  { type: 'xstate.after.listRefreshDelay.sessionList.active.pending' },
] as AnyEventObject[] as ListEvent[];
const key = (snapshot: ListSnapshot): string => JSON.stringify(snapshot.value);
// xstate/graph's types do not carry emitted events.
const graphLogic = machine as unknown as ActorLogic<
  ListSnapshot,
  ListEvent,
  typeof input
>;
const model = new TestModel(graphLogic, {
  input,
  events,
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' &&
    (event.type === 'list.refresh' || snapshot.can(event)),
  serializeState: (snapshot, event, previous): string =>
    JSON.stringify({
      value: snapshot.value,
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
});
const paths = model.getShortestPaths();
it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks list subscription model path %i', async (_, path): Promise<void> => {
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input, clock }).start();
  try {
    await path.test({
      events: Object.fromEntries(
        events.map(
          ({
            type,
          }): [
            'list.failed' | 'list.flush' | 'list.refresh' | 'list.stop',
            ({ event }: { event: AnyEventObject }) => void,
          ] => [
            type,
            ({ event }: { event: AnyEventObject }): void => {
              if (event.type.startsWith('xstate.after.')) clock.increment(100);
              else actor.send(event as ListEvent);
            },
          ],
        ),
      ),
      states: {
        '*': (expected): void => {
          expect(key(actor.getSnapshot())).toBe(key(expected));
          expect(actor.getSnapshot().status).toBe(expected.status);
        },
      },
    });
  } finally {
    actor.stop();
  }
});
it('the generated list subscription paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey: key,
      eventKey: (
        event,
      ): 'list.failed' | 'list.flush' | 'list.refresh' | 'list.stop' =>
        event.type,
    }),
  ).toEqual([]);
});
it('ends a subscription with the projection error when the stored data cannot be read', (): void => {
  const error = new Error('Unrecognised Session row');
  const actor = createActor(machine, {
    input: {
      ...input,
      readRows: (): never => {
        throw error;
      },
    },
  }).start();
  expect(actor.getSnapshot()).toMatchObject({
    status: 'done',
    context: { failure: error },
  });
  actor.stop();
});
it('publishes once after 100 ms even when fifty refreshes arrive while pending', (): void => {
  const clock = new SimulatedClock();
  let reads = 0;
  let publications = 0;
  const actor = createActor(machine, {
    clock,
    input: {
      ...input,
      readRows: (): never[] => {
        reads += 1;
        return [];
      },
    },
  });
  actor.on('list.rows', (): number => publications++);
  actor.start();
  for (let index = 0; index < 50; index++) actor.send({ type: 'list.refresh' });
  clock.increment(99);
  expect([reads, publications]).toEqual([1, 1]);
  actor.send({ type: 'list.refresh' });
  clock.increment(1);
  expect([reads, publications]).toEqual([2, 2]);
  actor.stop();
});
it('owns a delayed projection failure and cancels its observation', (): void => {
  const clock = new SimulatedClock();
  const error = new Error('Unavailable Session rows');
  let observations = 0;
  let reads = 0;
  const actor = createActor(
    sessionListMachine.provide({
      actors: {
        observe: fromCallback((): (() => number) => {
          observations += 1;
          return (): number => observations--;
        }),
      },
    }),
    {
      clock,
      input: {
        ...input,
        readRows: (): never[] => {
          if (reads++ > 0) throw error;
          return [];
        },
      },
    },
  ).start();
  actor.send({ type: 'list.refresh' });
  expect(observations).toBe(1);
  clock.increment(100);
  expect(actor.getSnapshot()).toMatchObject({
    status: 'done',
    context: { failure: error },
  });
  expect(observations).toBe(0);
  actor.stop();
});
