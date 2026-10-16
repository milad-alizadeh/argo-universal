import type { AnyActorRef } from 'xstate';
import type { RegistryActor, RegistryInput } from '../agents';
import {
  openDatabaseOf,
  requireDatabaseWriter,
  type EngineContext,
} from './setup.machine';

export const registryInput = ({
  context,
  self,
}: {
  context: Pick<EngineContext, 'database' | 'fetchAgents' | 'now'>;
  self: Pick<AnyActorRef, 'system'>;
}): RegistryInput => ({
  database: openDatabaseOf(context),
  writer: requireDatabaseWriter(self.system),
  fetchAgents: context.fetchAgents,
  now: context.now,
});

export const requireRegistry = (
  system: AnyActorRef['system'],
): RegistryActor => {
  const actor = system.get('registry');

  if (!actor) throw new Error('Registry is not running');

  return actor;
};
