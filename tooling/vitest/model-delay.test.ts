import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Actor, assign, createActor, setup } from 'xstate';
import { describeModel, modelTest, type Vertex } from './model-test';

// A delay that re-enters its own state leaves the state value as it was.
const machine = setup({ delays: { tick: 1000 } }).createMachine({
  id: 'clock',
  context: { ticks: 0 },
  initial: 'ticking',
  states: {
    ticking: {
      on: { 'clock.stop': 'stopped' },
      after: {
        tick: {
          target: 'ticking',
          reenter: true,
          actions: assign({ ticks: ({ context }) => context.ticks + 1 }),
        },
      },
    },
    stopped: { type: 'final' },
  },
});

let clock: Actor<typeof machine> | undefined;

beforeEach((): void => {
  vi.useFakeTimers();
});

afterEach((): void => {
  clock?.stop();
  vi.useRealTimers();
});

const stop = { type: 'clock.stop' };

const graph = {
  input: undefined,
  fixtures: [stop],
  vertex: (snapshot: { value: unknown }): Vertex => ({ value: snapshot.value }),
  walks: [{ name: 'shortest path', search: 'shortest' as const }],
};

const actorWith = (tick: number): Parameters<typeof modelTest>[2] => ({
  start: (): Actor<typeof machine> => {
    clock = createActor(machine).start();

    return clock;
  },
  delays: { tick },
  executors: { 'clock.stop': (): void => clock?.send(stop) },
  states: {
    ticking: (): void => expect(clock?.getSnapshot().status).toBe('active'),
    stopped: (): void => expect(clock?.getSnapshot().status).toBe('done'),
  },
});

describe('re-entering delay model', (): void => {
  const model = modelTest(machine, graph, actorWith(1000));

  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });

  it.each([999, 1001])(
    'fails a re-entering delay declared as %d ms when the timer takes 1000',
    async (declared): Promise<void> => {
      const cases = modelTest(machine, graph, actorWith(declared))
        .suites.flatMap(({ cases }) => cases)
        .filter(({ title }) => title.includes('after tick'));

      expect(cases).not.toEqual([]);

      for (const { run } of cases)
        await expect(run()).rejects.toThrow(/its declared delay/);
    },
  );
});
