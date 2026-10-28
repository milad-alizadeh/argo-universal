import type { AgentAuthSubject } from '@repo/contracts';
import type { AgentLaunch, DeferredAgentLaunch } from '../agent-launch';
import type { AgentsRouterDeps } from '../router';
import { requireInstalledAgent } from '../servers/installed-agents';
import type { ConnectionAuthentication } from './authenticate';

export const authenticationLaunch = async (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<ConnectionAuthentication> => {
  const launch = await installedLaunch(deps, subject);

  return deps.sessionConnections.acpResources().authentication(launch);
};

const installedLaunch = (
  deps: AgentsRouterDeps,
  subject: AgentAuthSubject,
): Promise<DeferredAgentLaunch> =>
  deps.installedAgents.launch(
    requireInstalledAgent(deps.installedAgents, subject.agent),
    subject.projectId,
    { signal: deps.sessionCommandSignal ?? new AbortController().signal },
  );

export function sharedSessionAuthentication(
  deps: AgentsRouterDeps,
  launch: AgentLaunch,
): Promise<ConnectionAuthentication> {
  return deps.sessionConnections.acpResources().authentication({
    agentId: launch.agentId,
    projectId: launch.projectId,
    version: launch.version,
    resolve: async () => ({ ...launch, argo: undefined, release: undefined }),
  });
}
