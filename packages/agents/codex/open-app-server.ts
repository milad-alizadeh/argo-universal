import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { describeError } from '../src/describe-error';
import type { VendorRequests } from './messages';
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

export const EXECUTABLE = 'codex';

interface Requests {
  initialize: [InitializeParams, InitializeResponse];
  'account/read': [GetAccountParams, GetAccountResponse];
  'model/list': [ModelListParams, ModelListResponse];
  'thread/start': [ThreadStartParams, ThreadStartResponse];
  'thread/resume': [ThreadResumeParams, ThreadResumeResponse];
  'turn/start': [TurnStartParams, TurnStartResponse];
  'turn/interrupt': [TurnInterruptParams, TurnInterruptResponse];
}

const stderrTailLength = 2000;
const rejectedLinePreviewLength = 200;
const gracefulStopLimitMs = 3000;
const forcedStopLimitMs = 5000;

// Owns the stdio transport and RPC correlation; vendor payloads use the generated types (ADR-0015).
export function openAppServer(
  cwd: string,
  onMessage: (message: {
    method: string;
    params: unknown;
    id?: string | number;
  }) => void,
  onFailure: (error: unknown) => void,
  signal: AbortSignal,
) {
  const {
    OPENAI_API_KEY: _openaiKey,
    CODEX_API_KEY: _codexKey,
    ...environment
  } = process.env;
  const child = spawn(EXECUTABLE, ['app-server', '--listen', 'stdio://'], {
    cwd,
    env: environment,
    stdio: 'pipe',
    detached: process.platform !== 'win32',
  });
  const pending = new Map<
    number,
    { resolve: (result: unknown) => void; reject: (error: Error) => void }
  >();
  let nextId = 0;
  let stderrTail = '';
  let stopping = false;
  let failed = false;
  const withStderr = (error: unknown) =>
    new Error(
      [describeError(error), stderrTail.trim()].filter(Boolean).join('\n'),
    );
  const fail = (error: unknown) => {
    if (failed) return;
    failed = true;
    const failure = withStderr(error);
    for (const entry of pending.values()) entry.reject(failure);
    pending.clear();
    if (!stopping) onFailure(failure);
  };
  child.stderr.on('data', (text) => {
    stderrTail = (stderrTail + text.toString()).slice(-stderrTailLength);
  });
  child.on('error', fail);
  child.stdin.on('error', fail);
  const exited = new Promise<void>((resolve) =>
    child.once('close', (code, signal) => {
      fail(`The Codex CLI exited (${signal ?? code}).`);
      resolve();
    }),
  );
  const send = (message: unknown) =>
    child.stdin.write(`${JSON.stringify(message)}\n`);
  const lines = createInterface({ input: child.stdout });
  lines.on('line', (line) => {
    try {
      const frame = readAppServerFrame(line);
      if (frame.kind === 'message') {
        if (
          frame.id !== undefined &&
          frame.method !== 'item/commandExecution/requestApproval' &&
          frame.method !== 'item/fileChange/requestApproval' &&
          frame.method !== 'item/tool/requestUserInput'
        ) {
          send({
            id: frame.id,
            error: {
              code: -32601,
              message: `Unsupported request: ${frame.method}`,
            },
          });
          return;
        }
        onMessage({ method: frame.method, params: frame.params, id: frame.id });
        return;
      }
      const entry = pending.get(frame.id);
      if (!entry)
        throw new Error(
          `Unrecognised app-server message: ${line.slice(0, rejectedLinePreviewLength)}`,
        );
      pending.delete(frame.id);
      if (frame.kind === 'error') entry.reject(withStderr(frame.message));
      else entry.resolve(frame.result);
    } catch (error) {
      fail(error);
    }
  });
  const request = <Method extends keyof Requests>(
    method: Method,
    params: Requests[Method][0],
  ): Promise<Requests[Method][1]> =>
    new Promise((resolve, reject) => {
      if (stopping || failed) {
        reject(withStderr('The Codex CLI is closed.'));
        return;
      }
      const id = ++nextId;
      pending.set(id, {
        resolve: (result) => resolve(result as Requests[Method][1]),
        reject,
      });
      send({ id, method, params });
    });
  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= (async () => {
      stopping = true;
      child.stdin.end();
      const terminate = (signal: NodeJS.Signals) => {
        if (!child.pid) return;
        try {
          if (process.platform === 'win32') child.kill(signal);
          else process.kill(-child.pid, signal);
        } catch {}
      };
      const graceful = setTimeout(
        () => terminate('SIGTERM'),
        gracefulStopLimitMs,
      );
      const forced = setTimeout(() => terminate('SIGKILL'), forcedStopLimitMs);
      await exited;
      clearTimeout(graceful);
      clearTimeout(forced);
      lines.close();
      signal.removeEventListener('abort', abort);
    })();
    return closing;
  };
  const abort = () => void close();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  return {
    request,
    respond: <Method extends keyof VendorRequests>(
      request: { method: Method; id: string | number },
      result: VendorRequests[Method][1],
    ) => send({ id: request.id, result }),
    notify: (method: string) => send({ method }),
    close,
  };
}

type AppServerFrame =
  | { kind: 'message'; method: string; params: unknown; id?: string | number }
  | { kind: 'error'; id: number; message: string }
  | { kind: 'result'; id: number; result: unknown };

// Narrows the JSON-RPC envelope before routing or correlating its vendor payload.
function readAppServerFrame(line: string): AppServerFrame {
  const message: unknown = JSON.parse(line);
  const preview = line.slice(0, rejectedLinePreviewLength);
  if (message === null || typeof message !== 'object' || Array.isArray(message))
    throw new Error(`Unrecognised app-server message: ${preview}`);
  const id = 'id' in message ? message.id : undefined;
  const method = 'method' in message ? message.method : undefined;
  if (
    (id !== undefined && typeof id !== 'string' && typeof id !== 'number') ||
    (method !== undefined && typeof method !== 'string') ||
    (id === undefined && method === undefined)
  )
    throw new Error(`Unrecognised app-server message: ${preview}`);
  if (typeof method === 'string')
    return {
      kind: 'message',
      method,
      params: 'params' in message ? message.params : undefined,
      id,
    };
  if (typeof id !== 'number')
    throw new Error(`Unrecognised app-server message: ${preview}`);
  if ('error' in message) {
    const error = message.error;
    if (
      error === null ||
      typeof error !== 'object' ||
      !('code' in error) ||
      typeof error.code !== 'number' ||
      !('message' in error) ||
      typeof error.message !== 'string'
    )
      throw new Error(`Invalid app-server error: ${preview}`);
    return { kind: 'error', id, message: error.message };
  }
  if (!('result' in message))
    throw new Error(`Unrecognised app-server message: ${preview}`);
  return { kind: 'result', id, result: message.result };
}
