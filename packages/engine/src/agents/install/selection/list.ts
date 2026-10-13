import type { AgentInfo, ConfiguredAgent } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readAgentCatalog } from '../../catalog-sql';
import { readConfiguredAgents } from '../../configuration/configuration-sql';
import {
  checkSelectedFiles,
  readInstallSelection,
  type InstallSelection,
} from './selection';
type InstalledAgent = {
  home: string;
  agentId: string;
  selection: InstallSelection;
  availableVersion?: string;
  enabled: boolean;
};
const installationInfo = ({
  enabled,
  ...input
}: InstalledAgent): AgentInfo => ({
  ...installationIdentity(input),
  availability: 'unavailable',
  installStep: enabled
    ? 'Installed. Sign-in readiness has not been checked.'
    : 'Agent is disabled. Enable it to start new Sessions.',
});
const installationIdentity = ({
  agentId,
  selection,
  availableVersion,
}: Omit<InstalledAgent, 'enabled'>): Pick<
  AgentInfo,
  'agent' | 'label' | 'logo' | 'version' | 'availableVersion'
> => ({
  agent: agentId,
  label: selection.entry.name,
  logo: selection.entry.icon ?? '',
  version: selection.entry.version,
  availableVersion,
});
const missingInstallation = (info: AgentInfo): AgentInfo => ({
  ...info,
  availability: 'not_installed',
  installStep:
    'The configured Agent launch file is missing or cannot be run. Install it again.',
});
const verifyInstallationInfo = async (
  input: InstalledAgent,
): Promise<AgentInfo> => {
  const info = installationInfo(input);
  try {
    await checkSelectedFiles(input.home, input.agentId, input.selection);
    return info;
  } catch {
    return missingInstallation(info);
  }
};
type InstallationQuery = {
  database: Database;
  home: string;
  agent: ConfiguredAgent;
  availableVersion?: string;
};
const installedInfo = async (
  input: InstallationQuery,
): Promise<AgentInfo[]> => {
  const selection = readInstallSelection(input.database, input.agent.id);
  if (!selection) return [];
  return [
    await verifyInstallationInfo({
      ...input,
      agentId: input.agent.id,
      enabled: input.agent.enabled,
      selection,
    }),
  ];
};
const configuredRegistry = (database: Database): ConfiguredAgent[] =>
  readConfiguredAgents(database).filter(
    (agent) =>
      !agent.configuration.removed && agent.configuration.source === 'registry',
  );
const availableVersions = (database: Database): Map<string, string> =>
  new Map(
    readAgentCatalog(database).agents.map(({ id, entry }) => [
      id,
      entry.version,
    ]),
  );
export const listInstalledAgents = async (
  database: Database,
  home: string,
): Promise<AgentInfo[]> => {
  const catalog = availableVersions(database);
  const read = (agent: ConfiguredAgent): Promise<AgentInfo[]> =>
    installedInfo({
      database,
      home,
      agent,
      availableVersion: catalog.get(agent.id),
    });
  return (await Promise.all(configuredRegistry(database).map(read))).flat();
};
