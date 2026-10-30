import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Actor, createActor, setup } from 'xstate';
import {
  describeModel,
  type Model,
  type ModelGraph,
  type ModelWalk,
  modelTest,
  type Vertex,
} from './model-test';

const machine = setup({ delays: { cooldown: 1000 } }).createMachine({
  id: 'kettle',
  initial: 'idle',
  states: {
    idle: { on: { 'kettle.heat': 'heating' } },
    heating: { after: { cooldown: 'idle' } },
  },
});

type Kettle = Actor<typeof machine>;

let kettle: Kettle | undefined;

const running = (): Kettle =>
  kettle ?? expect.unreachable('the kettle has not started');

beforeEach((): void => {
  vi.useFakeTimers();
});

afterEach((): void => {
  kettle?.stop();
  vi.useRealTimers();
});

const heat = { type: 'kettle.heat' };

const shortest: ModelWalk<typeof machine, typeof heat> = {
  name: 'shortest path',
  search: 'shortest',
};

const graph: ModelGraph<typeof machine, typeof heat> = {
  input: undefined,
  fixtures: [heat],
  vertex: (snapshot): Vertex => snapshot.value,
  walks: [shortest],
};

// The `cooldown` delay needs no fixture and no executor: the model finds it and fires its timer after the stated 1000 ms.
const actor = {
  start: (): Kettle => {
    kettle = createActor(machine).start();

    return kettle;
  },
  delays: { cooldown: 1000 },
  executors: { 'kettle.heat': (): void => running().send(heat) },
  states: {},
};

const walkOf = (walks: typeof graph.walks): Model =>
  modelTest(machine, { ...graph, walks }, actor);

async function runFirstCase(model: Model): Promise<void> {
  await model.suites[0]?.cases[0]?.run();
}

describe('kettle model', (): void => {
  const model = modelTest(machine, graph, actor);

  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
});

describe('model test', (): void => {
  it('throws when an event of the machine has no fixture', (): void => {
    expect(() => modelTest(machine, { ...graph, fixtures: [] }, actor)).toThrow(
      'Missing graph fixture for kettle.heat',
    );
  });

  it('throws when a fixture has no executor', (): void => {
    expect(() =>
      modelTest(machine, graph, { ...actor, executors: {} }),
    ).toThrow('Missing executor for kettle.heat');
  });

  it('throws when a delay has no declared duration', (): void => {
    expect(() => modelTest(machine, graph, { ...actor, delays: {} })).toThrow(
      'Missing declared delay for xstate.after.cooldown.kettle.heating',
    );
  });

  it.each([999, 1001])(
    'fails a delay declared as %d ms when the timer takes 1000',
    async (declared): Promise<void> => {
      const model = modelTest(machine, graph, {
        ...actor,
        delays: { cooldown: declared },
      });

      await expect(runFirstCase(model)).rejects.toThrow(/"idle"/);
    },
  );

  it('runs a delay declared as a function of the snapshot', async (): Promise<void> => {
    const model = modelTest(machine, graph, {
      ...actor,
      delays: {
        cooldown: (snapshot): number =>
          snapshot.matches('heating') ? 1000 : 0,
      },
    });

    await expect(runFirstCase(model)).resolves.toBeUndefined();
  });

  it('reports a transition that no generated path walks', (): void => {
    // Without arrivals, the shortest path to each state leaves the way back to a visited state unwalked.
    const model = walkOf([{ ...shortest, arrivals: false }]);

    expect(model.unwalked()).toEqual([
      expect.stringContaining('xstate.after.cooldown.kettle.heating'),
    ]);
  });

  it('stops a path where the walk says', (): void => {
    const model = walkOf([
      {
        ...shortest,
        stopWhen: (snapshot): boolean => snapshot.matches('heating'),
      },
    ]);

    expect(model.suites[0]?.cases.map(({ title }) => title)).toEqual([
      'xstate.init → kettle.heat',
    ]);
  });

  it('fails a delay whose state is left before it falls due', async (): Promise<void> => {
    // Steam leaves heating at 500 and settles into idle at 1000, so `heat → cooldown` only looks walked.
    const steaming = setup({
      delays: { cooldown: 1000, steam: 500, settle: 500 },
    }).createMachine({
      id: 'kettle',
      initial: 'idle',
      states: {
        idle: { on: { 'kettle.heat': 'heating' } },
        heating: { after: { cooldown: 'idle', steam: 'cooling' } },
        cooling: { after: { settle: 'idle' } },
      },
    });

    const started = createActor(steaming);

    const model = modelTest(steaming, graph, {
      start: () => started.start(),
      delays: { cooldown: 1000, steam: 500, settle: 500 },
      executors: { 'kettle.heat': (): void => started.send(heat) },
      states: {},
    });

    const cooldown = model.suites
      .flatMap(({ cases }) => cases)
      .find(({ title }) => title.endsWith('kettle.heat → after cooldown'));

    await expect(cooldown?.run()).rejects.toThrow('"cooling" left heating');
    started.stop();
  });
});
