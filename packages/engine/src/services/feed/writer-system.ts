import type { ActorRefFrom, AnyActorRef } from 'xstate';
import { isMachineActor } from '../../lib/machine-actor';
import { writerMachine } from './writer-machine';

export const databaseWriterId = 'databaseWriter';

export function findDatabaseWriter(
  system: AnyActorRef['system'],
): ActorRefFrom<typeof writerMachine> | undefined {
  const actor = system.get(databaseWriterId);
  return isMachineActor(actor, writerMachine) ? actor : undefined;
}
