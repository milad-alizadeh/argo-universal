import type { AgentAuthSubject } from '@repo/contracts';
import type { DeferredAgentLaunch } from '../agent-launch';
import type { AgentsRouterDeps } from '../router';
import { notInstalledError } from '../servers/installed-agents';
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
): Promise<DeferredAgentLaunch> => {
  const answer = deps.installedAgents.installedAgent(subject.agent);

  if (!answer.installed) throw notInstalledError(answer);

  return deps.installedAgents.launch(
    answer.agent,
    subject.projectId,
    deps.sessionCommandSignal ?? new AbortController().signal,
  );
};
