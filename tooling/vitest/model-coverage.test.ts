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

const stateKey = (snapshot: { value: unknown }): string =>
  JSON.stringify(snapshot.value);
const eventKey = (event: { type: string }): string => event.type;
const active = (snapshot: AnyMachineSnapshot, event: EventObject): boolean =>
  snapshot.status === 'active' && snapshot.can(event);
const model = new TestModel(machine, {
  filterEvents: active,
  events: [{ type: 'start' }, { type: 'skip' }, { type: 'finish' }],
});

describe('unwalkedTransitions', (): void => {
  it('finds none when the paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths: model.getSimplePaths(),
        stateKey,
        eventKey,
      }),
    ).toEqual([]);
  });

  it('names the transition that no path walks', (): void => {
    const paths = model
      .getSimplePaths()
      .filter((path): boolean => !path.description.includes('skip'));
    expect(
      unwalkedTransitions({ models: [model], paths, stateKey, eventKey }),
    ).toEqual(['"idle" skip "done"']);
  });

  it('unions the edges of several models', (): void => {
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

  it('fails when the models have no edges', (): void => {
    const empty = new TestModel(machine, { events: [], filterEvents: active });
    expect((): string[] =>
      unwalkedTransitions({ models: [empty], paths: [], stateKey, eventKey }),
    ).toThrow('The models have no transitions to walk.');
  });

  it('fails at the path cap', (): void => {
    const [path] = model.getSimplePaths();
    if (!path) throw new Error('The model has no paths.');
    const paths = Array.from({ length: 1000 }, (): typeof path => path);
    expect((): string[] =>
      unwalkedTransitions({ models: [model], paths, stateKey, eventKey }),
    ).toThrow('1000 paths reach the cap of 1000');
  });
});
