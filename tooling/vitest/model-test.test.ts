import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Actor, createActor, setup } from 'xstate';
import { modelTest, type Vertex } from './model-test';

const machine = setup({ delays: { cooldown: 1000 } }).createMachine({
  id: 'kettle',
  initial: 'idle',
  states: {
    idle: { on: { 'kettle.heat': 'heating' } },
    heating: { after: { cooldown: 'idle' } },
  },
});

let kettle: Actor<typeof machine> | undefined;

const running = (): Actor<typeof machine> =>
  kettle ?? expect.unreachable('the kettle has not started');

beforeEach((): void => {
  vi.useFakeTimers();
});

afterEach((): void => {
  kettle?.stop();
  vi.useRealTimers();
});

// The `cooldown` delay needs no fixture and no executor: the model finds it and fires its timer.
const model = modelTest(machine, {
  input: undefined,
  fixtures: [{ type: 'kettle.heat' }],
  vertex: (snapshot): Vertex => snapshot.value,
  running,
  start: (): void => {
    kettle = createActor(machine).start();
  },
  executors: {
    'kettle.heat': (): void => running().send({ type: 'kettle.heat' }),
  },
  states: {},
  walks: [{ name: 'shortest path', search: 'shortest' }],
});

describe('kettle model', (): void => {
  describe.each(model.suites)('$name', ({ cases }): void => {
    it.each(cases)('$title', async ({ run }): Promise<void> => {
      expect.hasAssertions();
      await run();
    });
  });

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});
