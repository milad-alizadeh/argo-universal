import type { ACPAgent } from '@repo/contracts';
import { defaultInstallPorts } from '../install/default-ports';
import { readRegistryCache, registrySupport } from '../registry/registry-cache';
import { requestRegistry } from '../registry/registry-machine';
import { vendorEnvironment } from '../vendor';
import { binaryCommand } from './binary';
import { npmCommand } from './npm';
import type { CommandInput, RegistryCommand } from './types';

type EntryLookup = Pick<
  CommandInput,
  'database' | 'registry' | 'id' | 'signal'
>;

const failed = async <Result>(work: () => Promise<Result>): Promise<Result> => {
  try {
    return await work();
  } catch (cause) {
    throw new Error(
      `failed ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
};

export const getCommand = (input: CommandInput): Promise<RegistryCommand> =>
  failed(async () => entryCommand(input, await requireEntry(input)));

// The Agent's current Registry entry: its version, without downloading anything.
export const getRegistryEntry = (input: EntryLookup): Promise<ACPAgent> =>
  failed(() => requireEntry(input));

// The command that runs `entry`: downloads or installs it, and holds its folder until `release`.
export const getEntryCommand = (
  input: CommandInput,
  entry: ACPAgent,
): Promise<RegistryCommand> => failed(() => entryCommand(input, entry));

const registryEntry = (input: EntryLookup): ACPAgent | undefined =>
  readRegistryCache(input.database)?.agents.find(({ id }) => id === input.id);

const requireEntry = async (input: EntryLookup): Promise<ACPAgent> => {
  input.signal.throwIfAborted();

  if (registryEntry(input)) input.registry.send({ type: 'STALE' });
  else await requestRegistry(input.registry, 'STALE');
  const entry = registryEntry(input);

  if (!isAvailable(entry))
    throw new Error(`Agent "${input.id}" is not in the ACP Registry.`);

  return entry;
};

const entryCommand = async (
  input: CommandInput,
  entry: ACPAgent,
): Promise<RegistryCommand> => {
  input.signal.throwIfAborted();

  return withEnvironment(input, await distributionCommand(input, entry));
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
