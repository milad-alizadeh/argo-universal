import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { AcpSessionOpening } from '../../acp';
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
