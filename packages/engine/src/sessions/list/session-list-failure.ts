import type { ActorRefFrom } from 'xstate';
import type { sessionListMachine } from './session-list-machine';

export type ListActor = ActorRefFrom<typeof sessionListMachine>;

export function throwListFailure(actor: ListActor): void {
  const snapshot = actor.getSnapshot();

  if (snapshot.status === 'error') throw snapshot.error;

  if (snapshot.matches('failed')) throw snapshot.context.failure;
}
