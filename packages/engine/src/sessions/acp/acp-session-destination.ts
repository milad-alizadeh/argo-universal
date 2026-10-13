import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { AcpSessionDestination } from '../../agents';
import type {
  AcpRequestEvent,
  AcpSessionRequests,
} from './acp-session-requests';

export type AcpLifetimeEvent =
  | { type: 'acp.update'; notification: SessionNotification; stale?: true }
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
export const reportFencedUpdate = (
  event: AcpLifetimeEvent,
  send: (event: AcpLifetimeEvent) => void,
): void => {
  if (event.type === 'acp.update') send({ ...event, stale: true });
};
