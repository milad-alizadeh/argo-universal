import type { ACPAgent } from '@repo/contracts';
import { defaultInstallPorts } from '../install/default-ports';
import { readRegistryCache, registrySupport } from '../registry/registry-cache';
import { requestRegistry } from '../registry/registry-machine';
import { readAgentServerEnv } from '../servers/agent-servers-sql';
import { vendorEnvironment } from '../vendor';
import { binaryCommand } from './binary';
import { npmCommand } from './npm';
import type { CommandInput, RegistryCommand } from './types';

export const getCommand = async (
  input: CommandInput,
): Promise<RegistryCommand> => {
  try {
    return await resolveCommand(input);
  } catch (cause) {
    throw new Error(
      `failed ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
};

const registryEntry = (input: CommandInput): ACPAgent | undefined =>
  readRegistryCache(input.database)?.agents.find(({ id }) => id === input.id);

const requireEntry = async (input: CommandInput): Promise<ACPAgent> => {
  if (registryEntry(input)) input.registry.send({ type: 'STALE' });
  else await requestRegistry(input.registry, 'STALE');
  const entry = registryEntry(input);

  if (!isAvailable(entry))
    throw new Error(`Agent "${input.id}" is not in the ACP Registry.`);

  return entry;
};

const resolveCommand = async (
  input: CommandInput,
): Promise<RegistryCommand> => {
  input.signal.throwIfAborted();
  const entry = await requireEntry(input);
  const command = await distributionCommand(input, entry);

  try {
    return withEnvironment(input, command);
  } catch (error) {
    command.release();
    throw error;
  }
};

const isAvailable = (entry: ACPAgent | undefined): entry is ACPAgent =>
  entry !== undefined && registrySupport(entry) !== 'unavailable';

const withEnvironment = (
  input: CommandInput,
  command: RegistryCommand,
): RegistryCommand => ({
  ...command,
  env: {
    ...command.env,
    ...vendorEnvironment({ registryId: input.id }),
    ...readAgentServerEnv(input.database, input.id),
  },
});

const distributionCommand = (
  input: CommandInput,
  entry: ACPAgent,
): Promise<RegistryCommand> => {
  const launch = { ...input, entry, ports: input.ports ?? defaultInstallPorts };

  return registrySupport(entry) === 'binary'
    ? binaryCommand(launch)
    : npmCommand(launch);
};
