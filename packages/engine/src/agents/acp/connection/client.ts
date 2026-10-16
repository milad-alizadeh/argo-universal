import {
  client,
  type ClientConnection,
  type ClientRequestHandlersByMethod,
  type SessionNotification,
  type Stream,
} from '@agentclientprotocol/sdk';
import {
  acceptTerminalRequests,
  type TerminalRequests,
} from '../shell-commands/terminal-requests';

type AgentClientInput = {
  stream: Stream;
  terminalRequests?: TerminalRequests;
  acceptSessionUpdate: (notification: SessionNotification) => undefined;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};

const sessionClient = (input: AgentClientInput): ReturnType<typeof client> =>
  client()
    .onNotification('session/update', ({ params }) =>
      input.acceptSessionUpdate(params),
    )
    .onRequest('session/request_permission', input.requestPermission)
    .onRequest('elicitation/create', input.createElicitation);

export const createAgentClient = (input: AgentClientInput): ClientConnection =>
  acceptTerminalRequests(sessionClient(input), input.terminalRequests).connect(
    input.stream,
  );

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
