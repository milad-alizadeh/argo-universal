import type { AgentInfo, ConfiguredAgent, AgentCheck } from '@repo/contracts';
import type { Database } from '@repo/db';
import type { ConfigurationDeps } from '../../configuration/configuration-commands';
import { readConfiguredAgents } from '../../configuration/configuration-sql';
import * as readiness from '../../configuration/custom-agent-list';
import { resolveInstalledAgentLaunch } from './launch';
import { withRegistryMetadata } from './registry-metadata';
import * as installed from './selection';
import { readInstallSelection } from './selection';

type InstalledAgent = {
  home: string;
  agentId: string;
  selection: installed.InstallSelection;
  enabled: boolean;
};

const installationInfo = ({
  enabled,
  agentId,
  selection,
}: InstalledAgent): AgentInfo => ({
  agent: agentId,
  label: selection.entry.name,
  logo: selection.entry.icon ?? '',
  version: selection.entry.version,
  availability: 'unavailable',
  installStep: enabled
    ? 'Installed. Sign-in readiness has not been checked.'
    : 'Agent is disabled. Enable it to start new Sessions.',
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
    await installed.checkSelectedFiles(
      input.home,
      input.agentId,
      input.selection,
    );

    return info;
  } catch {
    return missingInstallation(info);
  }
};

type InstallationQuery = {
  database: Database;
  home: string;
  agent: ConfiguredAgent;
  deps: ConfigurationDeps;
};

const uninstalledInfo = (input: InstallationQuery): AgentInfo => ({
  agent: input.agent.id,
  label: input.agent.id,
  logo: '',
  availability: 'not_installed',
  installStep: 'Install this Agent from Agents.',
});

const checkedInfo = (info: AgentInfo, result: AgentCheck): AgentInfo => ({
  ...info,
  availability: readiness.checkedAvailability(result),
  installStep: readiness.checkedStep(result),
});

const checkInstallation = async (
  input: InstallationQuery,
  info: AgentInfo,
): Promise<AgentCheck> => {
  const launch = await resolveInstalledAgentLaunch(
    input.database,
    input.home,
  )({ agent: info.agent, projectId: '', projectPath: input.home });

  return input.deps.checkAgentLaunch({ name: info.label, launch });
};

const needsReadinessCheck = (
  input: InstallationQuery,
  info: AgentInfo,
): boolean => input.agent.enabled && info.availability !== 'not_installed';

const failedReadiness = (cause: unknown): AgentCheck => ({
  status: 'failed',
  failure: String(cause),
});

const refreshReadiness = async (
  input: InstallationQuery,
  info: AgentInfo,
): Promise<AgentInfo> => {
  if (!needsReadinessCheck(input, info)) return info;
  const check = (): Promise<AgentCheck> => checkInstallation(input, info);

  const checking = input.deps.withAgentCheck
    ? input.deps.withAgentCheck(info.agent, check)
    : check();

  const result = await checking.catch(failedReadiness);

  return checkedInfo(info, result);
};

const installedInfo = async (
  input: InstallationQuery,
): Promise<AgentInfo[]> => {
  const selection = readInstallSelection(input.database, input.agent.id);

  if (!selection) return [uninstalledInfo(input)];

  const info = await verifyInstallationInfo({
    ...input,
    agentId: input.agent.id,
    enabled: input.agent.enabled,
    selection,
  });

  return [await refreshReadiness(input, info)];
};

const configuredRegistry = (database: Database): ConfiguredAgent[] =>
  readConfiguredAgents(database).filter(
    (agent) =>
      !agent.configuration.removed && agent.configuration.source === 'registry',
  );

export const listInstalledAgents = async (
  database: Database,
  home: string,
  deps: ConfigurationDeps,
): Promise<AgentInfo[]> => {
  const scope = { database, home, deps };

  const listed = await Promise.all(
    configuredRegistry(database).map((agent) =>
      installedInfo({ ...scope, agent }),
    ),
  );

  return withRegistryMetadata(database, listed.flat());
};
