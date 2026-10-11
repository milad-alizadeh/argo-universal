import {
  Actor,
  type ActorRefFrom,
  type AnyActorRef,
  type AnyStateMachine,
  StateMachine,
} from 'xstate';

export function findMachineActor<Machine extends AnyStateMachine>(
  system: AnyActorRef['system'],
  id: string,
  machine: Machine,
): ActorRefFrom<Machine> | undefined {
  const actor: unknown = system.get(id);
  return isActorOf(actor, machine) ? actor : undefined;
}

function isActorOf<Machine extends AnyStateMachine>(
  actor: unknown,
  machine: Machine,
): actor is ActorRefFrom<Machine> {
  return (
    actor instanceof Actor &&
    actor.logic instanceof StateMachine &&
    actor.logic.config === machine.config
  );
}
