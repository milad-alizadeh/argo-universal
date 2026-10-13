import { describe, expect, it } from 'vitest';
import {
  type AnyActorRef,
  createActor,
  createMachine,
  fromTransition,
} from 'xstate';
import { findMachineActor } from './machine-actor';

const machine = createMachine({
  id: 'owned',
  initial: 'ready',
  states: { ready: {} },
});
const actorId = 'catalog-test';
const find = (
  system: AnyActorRef['system'],
): ReturnType<typeof findMachineActor> =>
  findMachineActor(system, actorId, machine);

describe('findMachineActor', (): void => {
  it('finds a machine actor with supplied implementations', (): void => {
    const actor = createActor(machine.provide({}), {
      systemId: actorId,
    });
    expect(find(actor.system)).toBe(actor);
  });

  it('rejects an unrelated actor registered under the machine actor id', (): void => {
    const unrelated = createActor(
      fromTransition((): null => null, null),
      {
        systemId: actorId,
      },
    );
    expect(find(unrelated.system)).toBeUndefined();
  });

  it('rejects a different machine with the same machine id', (): void => {
    const unrelated = createActor(
      createMachine({
        id: machine.id,
        initial: 'ready',
        states: { ready: {} },
      }),
      { systemId: actorId },
    );
    expect(find(unrelated.system)).toBeUndefined();
  });

  it('reports an absent machine actor', (): void => {
    const actor = createActor(machine, {});
    expect(find(actor.system)).toBeUndefined();
  });
});
