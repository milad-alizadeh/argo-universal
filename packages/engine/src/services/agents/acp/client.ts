import {
  client,
  type ClientConnection,
  type ClientRequestHandlersByMethod,
  type SessionNotification,
  type Stream,
} from '@agentclientprotocol/sdk';

type AgentClientInput = {
  stream: Stream;
  acceptSessionUpdate: (notification: SessionNotification) => undefined;
  requestPermission: ClientRequestHandlersByMethod['session/request_permission'];
  createElicitation: ClientRequestHandlersByMethod['elicitation/create'];
};

export const createAgentClient = (input: AgentClientInput): ClientConnection =>
  client()
    .onNotification('session/update', ({ params }) =>
      input.acceptSessionUpdate(params),
    )
    .onRequest('session/request_permission', input.requestPermission)
    .onRequest('elicitation/create', input.createElicitation)
    .connect(input.stream);
