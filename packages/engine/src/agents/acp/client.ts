import {
  client,
  type ClientConnection,
  type ClientRequestHandlersByMethod,
  type SessionNotification,
  type Stream,
} from '@agentclientprotocol/sdk';
import type { AuthStatusUpdateNotification } from '@repo/contracts';
import { authStatusNotification, createAuthStatusReader } from './auth-status';

type AgentClientInput = {
  stream: Stream;
  acceptSessionUpdate: (notification: SessionNotification) => undefined;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
  acceptAuthStatus?: (notification: AuthStatusUpdateNotification) => void;
  rejectAuthStatus?: () => void;
};

export const createAgentClient = (input: AgentClientInput): ClientConnection =>
  client()
    .onNotification('session/update', ({ params }) =>
      input.acceptSessionUpdate(params),
    )
    .onRequest('session/request_permission', input.requestPermission)
    .onRequest('elicitation/create', input.createElicitation)
    .onNotification(
      authStatusNotification,
      createAuthStatusReader(input.rejectAuthStatus),
      ({ params }) => input.acceptAuthStatus?.(params),
    )
    .connect(input.stream);

export const awaitAcpOpening = async <Result>(
  work: Promise<Result>,
  signal?: AbortSignal,
): Promise<Result> => {
  const aborted = Promise.withResolvers<never>();
  const abort = (): void => aborted.reject(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });

  try {
    return await Promise.race([work, aborted.promise]);
  } finally {
    signal?.removeEventListener('abort', abort);
  }
};
