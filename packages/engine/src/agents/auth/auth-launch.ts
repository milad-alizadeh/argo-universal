import type { AgentAuthSubject } from '@repo/contracts';
import { readProjectPath } from '../../projects';
import type { AgentLaunch } from '../agent-launch';
import { resolveSavedAgentLaunch } from '../launch/saved-launch';
import type { AgentsRouterDeps } from '../router';
import type { ConnectionAuthentication } from './authenticate';

export const authenticationLaunch = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<ConnectionAuthentication> => {
  const launch = await savedLaunch(deps, subject);

  try {
    return await deps.sessionConnections.acpResources().authentication(launch);
  } finally {
    launch.release?.();
  }
};

const savedLaunch = (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<AgentLaunch> => {
  if (!deps.home) throw new Error('Server storage is unavailable');

  return resolveSavedAgentLaunch({
    database: deps.database,
    registry: deps.registry,
    home: deps.home,
    resources: deps.sessionConnections.acpResources(),
    ports: deps.sessions.getSnapshot().context.installationPorts,
  })(launchSubject(deps, subject));
};

const launchSubject = (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Parameters<ReturnType<typeof resolveSavedAgentLaunch>>[0] => ({
  ...subject,
  projectPath: readProjectPath(deps.database, subject.projectId),
  signal: deps.sessionCommandSignal,
});
