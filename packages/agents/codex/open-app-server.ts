import { createInterface } from 'node:readline';
import type { AppServerMessage } from './app-server-frame';
import {
  createProcessState,
  watchProcess,
  closeLines,
} from './app-server-process';
import { type Requests, requestMethod, sendFrame } from './app-server-requests';
import { routeLine } from './app-server-routing';
import type { VendorRequests } from './messages';
import type { Account, ModelListResponse } from './protocol.gen';
export { EXECUTABLE } from './app-server-process';
export type { Requests } from './app-server-requests';
interface AppServerInput {
  cwd: string;
  onMessage: (message: AppServerMessage) => void;
  onFailure: (error: unknown) => void;
  signal: AbortSignal;
}
const attachAbort = (signal: AbortSignal, abort: () => void): void => {
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
};
interface Transport {
  state: ReturnType<typeof createProcessState>;
  close: () => Promise<void>;
}
const transport = (input: AppServerInput): Transport => {
  const state = createProcessState(input.cwd);
  const exited = watchProcess(state, input.onFailure);
  const lines = createInterface({ input: state.child.stdout });
  lines.on('line', (line): void => routeLine({ ...input, state }, line));
  const close = (): Promise<void> =>
    closeLines({ state, exited, lines, signal: input.signal, abort });
  const abort = (): void => {
    void close();
  };
  attachAbort(input.signal, abort);
  return { state, close };
};
interface AppServer {
  request: <Method extends keyof Requests>(
    method: Method,
    params: Requests[Method][0],
  ) => Promise<Requests[Method][1]>;
  respond: <Method extends keyof VendorRequests>(
    request: { method: Method; id: string | number },
    result: VendorRequests[Method][1],
  ) => boolean;
  notify: (method: string) => boolean;
  close: () => Promise<void>;
}
export function openAppServer(input: AppServerInput): AppServer {
  const { state, close } = transport(input);
  return {
    request: (method, params): ReturnType<AppServer['request']> =>
      requestMethod(state, method, params),
    respond: (request, result): boolean =>
      sendFrame(state, { id: request.id, result }),
    notify: (method): boolean => sendFrame(state, { method }),
    close,
  };
}
export type AccountIdentity = Account;
export type ModelListPage = ModelListResponse;
