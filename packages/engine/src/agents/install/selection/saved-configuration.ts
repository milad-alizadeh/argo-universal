import type { AgentConfiguration, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readConfiguredAgent } from '../../configuration/configuration-sql';
import type { InstallSelection } from './selection';
type RegistryConfiguration = Extract<
  AgentConfiguration,
  { source: 'registry' }
>;
type PreviousRegistry = {
  configuration: RegistryConfiguration;
  enabled: boolean;
};
const emptyConfiguration: RegistryConfiguration = {
  source: 'registry',
  release: null,
  overrides: { args: [], env: [] },
};
const previousRegistry = (
  previous: ConfiguredAgent | undefined,
): PreviousRegistry => {
  if (!previous) return { configuration: emptyConfiguration, enabled: true };
  if (previous.configuration.source !== 'registry')
    throw new Error('Agent is a custom registration');
  return {
    configuration: previous.configuration,
    enabled: previous.enabled,
  };
};
const selectionConfiguration = (
  previous: RegistryConfiguration,
  selection: InstallSelection,
): string =>
  JSON.stringify({
    ...previous,
    removed: undefined,
    release: JSON.stringify(selection),
  });
type SavedInstallation = {
  id: string;
  enabled: boolean;
  configuration: string;
};
export const savedInstallation = (
  database: Database,
  agentId: string,
  selection: InstallSelection,
): SavedInstallation => {
  const previous = previousRegistry(readConfiguredAgent(database, agentId));
  const serialized = selectionConfiguration(previous.configuration, selection);
  return { id: agentId, enabled: previous.enabled, configuration: serialized };
};
