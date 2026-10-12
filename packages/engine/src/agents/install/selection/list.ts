import type { AgentInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
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
};
const installationInfo = ({
  agentId,
  selection,
}: InstalledAgent): AgentInfo => ({
  agent: agentId,
  label: selection.entry.name,
  logo: selection.entry.icon ?? '',
  configOptions: [],
  availability: 'unavailable',
  installStep: 'Installed. Sign-in readiness has not been checked.',
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
const installedInfo = async (
  database: Database,
  home: string,
  agentId: string,
): Promise<AgentInfo[]> => {
  const selection = readInstallSelection(database, agentId);
  return selection
    ? [await verifyInstallationInfo({ home, agentId, selection })]
    : [];
};
export const listInstalledAgents = (
  database: Database,
  home: string,
): Promise<AgentInfo[]> => {
  const configured = readConfiguredAgents(database).filter(
    (agent) => agent.enabled && agent.configuration.source === 'registry',
  );
  return Promise.all(
    configured.map((agent) => installedInfo(database, home, agent.id)),
  ).then((agents) => agents.flat());
};
