import {
  loggedMessages,
  requestsIn as loggedRequestsIn,
  type LoggedMessage,
  type LoggedRequest,
} from './agent-requests';

export function requestsIn(
  messages: LoggedMessage[],
  method: string,
): LoggedRequest[] {
  return loggedRequestsIn(messages, method).filter(
    (request) => request.mainSession === true,
  );
}

export function requests(path: string, method: string): LoggedRequest[] {
  return requestsIn(loggedMessages(path), method);
}
