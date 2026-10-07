import { describe, expect, it } from 'vitest';
import {
  type AnyMachineSnapshot,
  createMachine,
  type EventObject,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import { unwalkedTransitions } from './model-coverage';

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

describe('unwalkedTransitions', () => {
  it('finds none when the paths walk every transition', () => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths: model.getSimplePaths(),
        stateKey,
        eventKey,
      }),
    ).toEqual([]);
  });

  it('names the transition that no path walks', () => {
    const paths = model
      .getSimplePaths()
      .filter((path) => !path.description.includes('skip'));
    expect(
      unwalkedTransitions({ models: [model], paths, stateKey, eventKey }),
    ).toEqual(['"idle" skip "done"']);
  });

  it('unions the edges of several models', () => {
    const skipModel = new TestModel(machine, {
      events: [{ type: 'skip' }],
      filterEvents: active,
    });
    const paths = skipModel.getSimplePaths();
    expect(
      unwalkedTransitions({ models: [skipModel], paths, stateKey, eventKey }),
    ).toEqual([]);
    expect(
      unwalkedTransitions({
        models: [skipModel, model],
        paths,
        stateKey,
        eventKey,
      }),
    ).toEqual(['"idle" start "busy"', '"busy" finish "done"']);
  });

  it('fails when the models have no edges', () => {
    const empty = new TestModel(machine, { events: [], filterEvents: active });
    expect(() =>
      unwalkedTransitions({ models: [empty], paths: [], stateKey, eventKey }),
    ).toThrow('The models have no transitions to walk.');
  });

  it('fails at the path cap', () => {
    const [path] = model.getSimplePaths();
    if (!path) throw new Error('The model has no paths.');
    const paths = Array.from({ length: 1000 }, () => path);
    expect(() =>
      unwalkedTransitions({ models: [model], paths, stateKey, eventKey }),
    ).toThrow('1000 paths reach the cap of 1000');
  });
});
