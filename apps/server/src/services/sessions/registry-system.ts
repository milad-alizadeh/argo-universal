import type { AnyActorRef } from 'xstate';
import { isMachineActor } from '../../lib/machine-actor';
import { registryMachine, type RegistryActorRef } from './registry-machine';

export const sessionRegistryId = 'sessions';

export function findSessionRegistry(
  system: AnyActorRef['system'],
): RegistryActorRef | undefined {
  const actor = system.get(sessionRegistryId);
  return isMachineActor(actor, registryMachine) ? actor : undefined;
}
