import type { AgentAuthSubject } from '@repo/contracts';
import { readProjectPath } from '../../projects';
import type { AgentLaunch } from '../agent-launch';
import { resolveInstalledAgentLaunch } from '../install/selection/launch';
import { definedEnvironment } from '../launch/agent-environment';
import { getCommand } from '../launch/get-command';
import { shellEnvironment } from '../launch/shell-env';
import type { RegistryCommand } from '../launch/types';
import type { AgentsRouterDeps } from '../router';
import { readAgentServers } from '../servers/agent-servers-sql';
import type { ConnectionAuthentication } from './authenticate';

const homeOf = (deps: AgentsRouterDeps): string => {
  if (!deps.home) throw new Error('Server storage is unavailable');

  return deps.home;
};

const registryCommand = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<RegistryCommand> =>
  getCommand({
    database: deps.database,
    registry: deps.registry,
    home: homeOf(deps),
    id: subject.agent,
    shellEnv: await projectEnvironment(deps, subject.projectId),
    signal: deps.sessionCommandSignal ?? new AbortController().signal,
    isDirectoryInUse: deps.sessionConnections.acpResources().isDirectoryInUse,
  });

const projectEnvironment = async (
  deps: AgentsRouterDeps,
  projectId: string,
): Promise<Record<string, string>> =>
  definedEnvironment(
    await shellEnvironment(readProjectPath(deps.database, projectId)),
  );

const commandLaunch = (
  command: RegistryCommand,
  subject: AgentAuthSubject,
  cwd: string,
): AgentLaunch => ({
  ...command,
  installationDirectory: command.directory,
  agentId: subject.agent,
  registryId: subject.agent,
  projectId: subject.projectId,
  cwd,
  authContext: 'local',
});

const registryAuthentication = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<ConnectionAuthentication> => {
  const command = await registryCommand(deps, subject);

  const cwd = readProjectPath(deps.database, subject.projectId);
  const launch = commandLaunch(command, subject, cwd);

  try {
    return await deps.sessionConnections.acpResources().authentication(launch);
  } finally {
    command.release();
  }
};

const installedLaunch = (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<AgentLaunch> => {
  const resolve = resolveInstalledAgentLaunch(deps.database, homeOf(deps));

  return resolve({
    ...subject,
    projectPath: readProjectPath(deps.database, subject.projectId),
  });
};

export const authenticationLaunch = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<ConnectionAuthentication> => {
  if (readAgentServers(deps.database).some(({ id }) => id === subject.agent))
    return registryAuthentication(deps, subject);

  const launch = await installedLaunch(deps, subject);

  return deps.sessionConnections.acpResources().authentication(launch);
};
