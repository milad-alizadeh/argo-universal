import {
  loggedMessages,
  requestsIn as loggedRequestsIn,
  type LoggedMessage,
  type LoggedRequest,
} from './agent-requests';

function hasSessionAccess(request: LoggedRequest): boolean {
  return (request.params?.mcpServers ?? []).length > 0;
}

function isConversationOpening(message: LoggedMessage): boolean {
  return 'method' in message && hasSessionAccess(message);
}

export function requestsIn(
  messages: LoggedMessage[],
  method: string,
): LoggedRequest[] {
  const conversations = new Set(
    messages
      .values()
      .filter(isConversationOpening)
      .map((message) => message.agent),
  );

  return loggedRequestsIn(messages, method).filter((request) =>
    conversations.has(request.agent),
  );
}

export function requests(path: string, method: string): LoggedRequest[] {
  return requestsIn(loggedMessages(path), method);
}
