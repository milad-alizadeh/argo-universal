import type {
  GetAccountParams,
  GetAccountResponse,
  InitializeParams,
  InitializeResponse,
  ModelListParams,
  ModelListResponse,
  ThreadResumeParams,
  ThreadResumeResponse,
  ThreadStartParams,
  ThreadStartResponse,
  TurnInterruptParams,
  TurnInterruptResponse,
  TurnStartParams,
  TurnStartResponse,
} from './protocol.gen';

export interface Requests {
  initialize: [InitializeParams, InitializeResponse];
  'account/read': [GetAccountParams, GetAccountResponse];
  'model/list': [ModelListParams, ModelListResponse];
  'thread/start': [ThreadStartParams, ThreadStartResponse];
  'thread/resume': [ThreadResumeParams, ThreadResumeResponse];
  'turn/start': [TurnStartParams, TurnStartResponse];
  'turn/interrupt': [TurnInterruptParams, TurnInterruptResponse];
}

import { type ProcessState, withStderr } from './app-server-process';
import { responseValidators } from './payloads';
export const sendFrame = (state: ProcessState, message: unknown): boolean =>
  state.child.stdin.write(`${JSON.stringify(message)}\n`);
type ResponseInput<Method extends keyof Requests> = Pick<
  PendingRequest<Method>,
  'method' | 'resolve' | 'reject'
> & { result: unknown };
const resolveResponse = <Method extends keyof Requests>(
  input: ResponseInput<Method>,
): void => {
  if (responseValidators[input.method](input.result))
    input.resolve(input.result);
  else input.reject(new Error(`Invalid app-server response: ${input.method}`));
};
interface PendingRequest<Method extends keyof Requests> {
  state: ProcessState;
  method: Method;
  params: Requests[Method][0];
  resolve: (response: Requests[Method][1]) => void;
  reject: (error: Error) => void;
}
const enqueueRequest = <Method extends keyof Requests>(
  input: PendingRequest<Method>,
): void => {
  if (input.state.stopping || input.state.failed) {
    input.reject(withStderr(input.state, 'The Codex CLI is closed.'));
    return;
  }
  const id = ++input.state.nextId;
  input.state.pending.set(id, {
    resolve: (result): void => resolveResponse({ ...input, result }),
    reject: input.reject,
  });
  sendFrame(input.state, { id, method: input.method, params: input.params });
};
export const requestMethod = <Method extends keyof Requests>(
  state: ProcessState,
  method: Method,
  params: Requests[Method][0],
): Promise<Requests[Method][1]> =>
  new Promise((resolve, reject): void =>
    enqueueRequest({ state, method, params, resolve, reject }),
  );
