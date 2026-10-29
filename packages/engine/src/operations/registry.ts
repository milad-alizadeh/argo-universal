import type { RegistryAgentId } from '@repo/contracts';
import { registryOperations } from '@repo/contracts/operations/registry';
import {
  changeAgentServer,
  readAgentServers,
  readRegistry,
  refreshRegistry,
  syncRegistry,
  type RegistryDeps,
} from '../agents';
import type { OperationImplementations } from './operations';

type RegistryImplementations = Pick<
  OperationImplementations,
  keyof typeof registryOperations
>;

export function createRegistryOperations(
  deps: RegistryDeps,
): RegistryImplementations {
  return {
    'registry.get': async () =>
      readRegistry(deps.database, deps.registry.getSnapshot().context.error),
    'registry.refresh': () => refreshRegistry(deps),
    'registry.sync': () => syncRegistry(deps),
    'agent.list': async () => readAgentServers(deps.database),
    'agent.install': (input) => changeInstallation(deps, input, 'add'),
    'agent.remove': (input) => changeInstallation(deps, input, 'remove'),
  };
}

async function changeInstallation(
  deps: RegistryDeps,
  { id }: RegistryAgentId,
  action: 'add' | 'remove',
): Promise<null> {
  await changeAgentServer(deps, id, action);

  return null;
}
