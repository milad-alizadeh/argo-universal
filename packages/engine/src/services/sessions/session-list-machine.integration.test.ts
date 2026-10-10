import { randomUUID } from 'node:crypto';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import { afterAll, expect, it } from 'vitest';
import {
  createActor,
  fromCallback,
  SimulatedClock,
  type SnapshotFrom,
} from 'xstate';
import {
  type AdjacencyMap,
  type GraphEventFromLogic,
  getAdjacencyMap,
  getShortestPaths,
} from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import { registryMachine } from './registry-machine';
import { sessionListMachine } from './session-list-machine';

const refreshListEvent = 'list.refresh';
const refreshDelayEvent =
  'xstate.after.listRefreshDelay.sessionList.active.pending';

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
  sessionIdsForChanges: (): never[] => [],
  relatedSessionIds: (ids: readonly string[]): string[] => [...ids],
};
const machine = sessionListMachine.provide({
  actors: { observe: fromCallback((): void => {}) },
});
type ListSnapshot = SnapshotFrom<typeof machine>;
// The model drives the pending state's named delay event as well as public events.
const events = [
  { type: refreshListEvent },
  { type: 'list.failed', error: 'Unavailable database' },
  { type: 'list.stop' },
  { type: 'list.flush' },
  { type: refreshDelayEvent },
] satisfies GraphEventFromLogic<typeof machine>[];
type ListEvent = (typeof events)[number];
const key = (snapshot: ListSnapshot): string => JSON.stringify(snapshot.value);
const options = {
  input,
  events,
  filterEvents: (snapshot: ListSnapshot, event: ListEvent): boolean =>
    snapshot.status === 'active' &&
    (event.type === refreshListEvent ||
      (event.type === refreshDelayEvent
        ? snapshot.matches({ active: 'pending' })
        : snapshot.can(event))),
  serializeState: (
    snapshot: ListSnapshot,
    event: ListEvent | undefined,
    previous?: ListSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
};
const paths = terminalPaths(getShortestPaths(machine, options));
it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks list subscription model path %i', async (_, path): Promise<void> => {
  const clock = new SimulatedClock();
  const actor = createActor(machine, { input, clock }).start();
  const execute = (event: ListEvent): void => {
    if (event.type === refreshDelayEvent) clock.increment(100);
    else actor.send(event);
  };
  try {
    for (const [index, step] of path.steps.entries()) {
      if (index > 0) execute(step.event);
      expect(key(actor.getSnapshot())).toBe(key(step.state));
      expect(actor.getSnapshot().status).toBe(step.state.status);
    }
  } finally {
    actor.stop();
  }
});
it('the generated list subscription paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [
        {
          getAdjacencyMap: (): AdjacencyMap<ListSnapshot, ListEvent> =>
            getAdjacencyMap(machine, options),
        },
      ],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
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
  for (let index = 0; index < 50; index++)
    actor.send({ type: refreshListEvent });
  clock.increment(99);
  expect([reads, publications]).toEqual([1, 1]);
  actor.send({ type: refreshListEvent });
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
  actor.send({ type: refreshListEvent });
  expect(observations).toBe(1);
  clock.increment(100);
  expect(actor.getSnapshot()).toMatchObject({
    status: 'done',
    context: { failure: error },
  });
  expect(observations).toBe(0);
  actor.stop();
});
