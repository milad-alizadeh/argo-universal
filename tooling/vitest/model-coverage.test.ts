import { describe, expect, it } from 'vitest';
import { type AnyMachineSnapshot, createMachine, type EventObject } from 'xstate';
import { TestModel } from 'xstate/graph';
import { expectEveryTransitionWalked } from './model-coverage';

const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { start: 'busy', skip: 'done' } },
    busy: { on: { finish: 'done' } },
    done: { type: 'final' },
  },
});

const stateKey = (snapshot: { value: unknown }) =>
  JSON.stringify(snapshot.value);
const eventKey = (event: { type: string }) => event.type;
const active = (snapshot: AnyMachineSnapshot, event: EventObject) =>
  snapshot.status === 'active' && snapshot.can(event);
const model = new TestModel(machine, {
  filterEvents: active,
  events: [{ type: 'start' }, { type: 'skip' }, { type: 'finish' }],
});

describe('expectEveryTransitionWalked', () => {
  it('passes when the paths walk every transition', () => {
    expectEveryTransitionWalked({
      models: [model],
      paths: model.getSimplePaths(),
      stateKey,
      eventKey,
    });
  });

  it('names the transition that no path walks', () => {
    const paths = model
      .getSimplePaths()
      .filter((path) => !path.description.includes('skip'));
    expect(() =>
      expectEveryTransitionWalked({
        models: [model],
        paths,
        stateKey,
        eventKey,
      }),
    ).toThrow(/"idle" skip "done"/);
  });

  it('unions the edges of several models', () => {
    const skipModel = new TestModel(machine, {
      events: [{ type: 'skip' }],
      filterEvents: active,
    });
    const paths = skipModel.getSimplePaths();
    expect(() =>
      expectEveryTransitionWalked({
        models: [skipModel],
        paths,
        stateKey,
        eventKey,
      }),
    ).not.toThrow();
    expect(() =>
      expectEveryTransitionWalked({
        models: [skipModel, model],
        paths,
        stateKey,
        eventKey,
      }),
    ).toThrow(/"idle" start "busy"/);
  });

  it('fails when the models have no edges', () => {
    const empty = new TestModel(machine, { events: [], filterEvents: active });
    expect(() =>
      expectEveryTransitionWalked({
        models: [empty],
        paths: [],
        stateKey,
        eventKey,
      }),
    ).toThrow();
  });

  it('fails at the path cap', () => {
    const [path] = model.getSimplePaths();
    if (!path) throw new Error('The model has no paths.');
    const paths = Array.from({ length: 1000 }, () => path);
    expect(() =>
      expectEveryTransitionWalked({
        models: [model],
        paths,
        stateKey,
        eventKey,
      }),
    ).toThrow();
  });
});
