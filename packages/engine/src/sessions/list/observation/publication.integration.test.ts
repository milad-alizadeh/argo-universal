import { afterAll, expect, it } from 'vitest';
import { createActor, fromCallback, SimulatedClock } from 'xstate';
import { openSessionListModel } from '#mocks/session-list-model';
import { sessionListMachine } from './machine';

const refreshListEvent = 'list.refresh';

const { input, remove } = openSessionListModel();

afterAll(remove);

const machine = sessionListMachine.provide({
  actors: { observe: fromCallback((): void => {}) },
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
