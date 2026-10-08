export type AppServerMessage = {
  method: string;
  params: unknown;
  id: string | number | undefined;
};
type AppServerFrame =
  | ({ kind: 'message' } & AppServerMessage)
  | { kind: 'error'; id: number; message: string }
  | { kind: 'result'; id: number; result: unknown };
const rejectedLinePreviewLength = 200;
const invalidFrame = (line: string): Error =>
  new Error(
    `Unrecognised app-server message: ${line.slice(0, rejectedLinePreviewLength)}`,
  );
const frameObject = (message: unknown, line: string): object => {
  if (!isObject(message)) throw invalidFrame(line);
  if (Array.isArray(message)) throw invalidFrame(line);
  return message;
};
const frameId = (
  message: object,
  line: string,
): string | number | undefined => {
  const id = optionalId(message);
  if (id === undefined) return id;
  if (typeof id === 'string') return id;
  return numericId(id, line);
};
const frameMethod = (message: object, line: string): string | undefined => {
  const method = optionalMethod(message);
  if (method === undefined) return undefined;
  if (typeof method !== 'string') throw invalidFrame(line);
  return method;
};
const errorObject = (error: unknown, line: string): object => {
  if (error === null || typeof error !== 'object')
    throw new Error(
      `Invalid app-server error: ${line.slice(0, rejectedLinePreviewLength)}`,
    );
  return error;
};
const errorCode = (error: object, line: string): void => {
  if (!('code' in error) || typeof error.code !== 'number')
    throw new Error(
      `Invalid app-server error: ${line.slice(0, rejectedLinePreviewLength)}`,
    );
};
const errorMessage = (error: object, line: string): string => {
  if (!('message' in error) || typeof error.message !== 'string')
    throw new Error(
      `Invalid app-server error: ${line.slice(0, rejectedLinePreviewLength)}`,
    );
  return error.message;
};
const responseFrame = (
  message: object,
  id: string | number | undefined,
  line: string,
): AppServerFrame => {
  const responseId = numericId(id, line);
  if ('error' in message) return failedFrame(message.error, responseId, line);
  if (!('result' in message)) throw invalidFrame(line);
  return { kind: 'result', id: responseId, result: message.result };
};
const failedFrame = (
  payload: unknown,
  id: number,
  line: string,
): AppServerFrame => {
  const error = errorObject(payload, line);
  errorCode(error, line);
  return { kind: 'error', id, message: errorMessage(error, line) };
};
export function readAppServerFrame(line: string): AppServerFrame {
  const message = frameObject(JSON.parse(line), line);
  const id = frameId(message, line);
  const method = frameMethod(message, line);
  if (method !== undefined)
    return {
      kind: 'message',
      method,
      params: 'params' in message ? message.params : undefined,
      id,
    };
  return responseFrame(message, id, line);
}

const isObject = (message: unknown): message is object =>
  message !== null && typeof message === 'object';
const optionalId = (message: object): unknown =>
  'id' in message ? message.id : undefined;
const optionalMethod = (message: object): unknown =>
  'method' in message ? message.method : undefined;
const numericId = (id: unknown, line: string): number => {
  if (typeof id !== 'number') throw invalidFrame(line);
  return id;
};
