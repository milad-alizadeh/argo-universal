import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { AcpSessionOpening, ResolveAgentLaunch } from '../../agents';
import type { SessionData } from '../session-data';

const createNewSessionRequest = (session: SessionData): NewSessionRequest => ({
  cwd: session.checkout.path,
  mcpServers: [],
});

export const selectSessionOpening = (
  session: SessionData,
): AcpSessionOpening => {
  const params = createNewSessionRequest(session);

  if (session.vendorSessionId === null)
    return { method: 'session/new', params };

  return {
    method: 'session/resume',
    params: { ...params, sessionId: session.vendorSessionId },
  };
};

type LaunchDependencies = {
  resolveLaunch: ResolveAgentLaunch;
  projectPath: (id: string) => string;
};

// The Agent launch a Session opens with, resolved in its Project.
export const resolveSessionLaunch = (
  session: SessionData,
  dependencies: LaunchDependencies,
): ReturnType<ResolveAgentLaunch> =>
  dependencies.resolveLaunch({
    agent: session.agent,
    projectId: session.projectId,
    projectPath: dependencies.projectPath(session.projectId),
  });
