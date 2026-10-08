import { Actor, type AnyStateMachine, StateMachine } from 'xstate';

export function isMachineActor<Machine extends AnyStateMachine>(
  actor: unknown,
  machine: Machine,
): actor is Actor<Machine> {
  return actor instanceof Actor && ownsMachine(actor.logic, machine);
}

function ownsMachine(logic: unknown, machine: AnyStateMachine): boolean {
  return logic instanceof StateMachine && logic.config === machine.config;
}
