import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MessageId, releaseMarker } from '@repo/mocks/agent/request-log';
import { z } from 'zod';

const LoggedRequest = z.object({
  agent: z.number(),
  method: z.string(),
  id: MessageId.optional(),
  params: z
    .object({
      cwd: z.string().optional(),
      configId: z.string().optional(),
      value: z.unknown().optional(),
    })
    .optional(),
});

export type LoggedRequest = z.infer<typeof LoggedRequest>;

const LoggedMessage = z.union([
  LoggedRequest,
  z.object({ agent: z.number(), answered: MessageId }),
]);

export type LoggedMessage = z.infer<typeof LoggedMessage>;

// What the Agent received and answered, in order.
export const loggedMessages = (requestLogPath: string): LoggedMessage[] =>
  existsSync(requestLogPath)
    ? readFileSync(requestLogPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => LoggedMessage.parse(JSON.parse(line)))
    : [];

export const requestsIn = (
  messages: LoggedMessage[],
  method: string,
): LoggedRequest[] =>
  messages.filter(
    (message): message is LoggedRequest =>
      'method' in message && message.method === method,
  );

export const requests = (
  requestLogPath: string,
  method: string,
): LoggedRequest[] => requestsIn(loggedMessages(requestLogPath), method);

// Where the Agent received the request.
export const receivedAt = (
  messages: LoggedMessage[],
  request: LoggedRequest,
): number => messages.indexOf(request);

const answers = (message: LoggedMessage, request: LoggedRequest): boolean =>
  'answered' in message &&
  message.agent === request.agent &&
  message.answered === request.id;

// Where the same Agent process answered the request, or -1 while it has not.
export const answeredAt = (
  messages: LoggedMessage[],
  request: LoggedRequest,
): number => {
  const received = receivedAt(messages, request);

  return messages.findIndex(
    (message, index) => index > received && answers(message, request),
  );
};

// Lets every step the scripted Agent holds with `wait-for-release` go on.
export const releaseAgent = (requestLogPath: string): void => {
  writeFileSync(releaseMarker(requestLogPath), '');
};
