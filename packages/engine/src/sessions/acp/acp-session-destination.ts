import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { AcpSessionDestination } from '../../agents';
import type {
  AcpRequestEvent,
  AcpSessionRequests,
} from './requests/acp-session-requests';

export type AcpLifetimeEvent =
  | { type: 'acp.update'; notification: SessionNotification }
  | { type: 'acp.failed'; error: unknown }
  | AcpRequestEvent;

export const createLifetimeDestination = (
  requests: AcpSessionRequests,
  send: (event: AcpLifetimeEvent) => void,
): AcpSessionDestination => ({
  update: (notification): undefined => {
    send({ type: 'acp.update', notification });
  },
  failed: (error) => send({ type: 'acp.failed', error }),
  requestPermission: requests.requestPermission(send),
  createElicitation: requests.createElicitation(send),
});
