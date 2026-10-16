import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { AcpSessionOpening, ResolveAgentLaunch } from '../../agents';
import type { SessionData } from '../session-data';
import type { AcpSessionDependencies } from './acp-lifetime';

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

export const resolveSessionAgentLaunch = (
  session: SessionData,
  dependencies: AcpSessionDependencies,
  signal: AbortSignal,
): ReturnType<ResolveAgentLaunch> =>
  dependencies.resolveLaunch({
    signal,
    agent: session.agent,
    projectId: session.projectId,
    projectPath: dependencies.projectPath(session.projectId),
  });
