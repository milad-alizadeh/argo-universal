import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { describeError } from '../src/describe-error';
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
interface WireMessage {
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

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
    stderrTail = (stderrTail + text.toString()).slice(-2000);
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
      const message = JSON.parse(line) as WireMessage;
      if (message === null || typeof message !== 'object')
        throw new Error('Invalid app-server envelope.');
      if (typeof message.method === 'string') {
        if (message.id !== undefined) {
          if (
            message.method !== 'item/commandExecution/requestApproval' &&
            message.method !== 'item/fileChange/requestApproval' &&
            message.method !== 'item/tool/requestUserInput'
          ) {
            send({
              id: message.id,
              error: {
                code: -32601,
                message: `Unsupported request: ${message.method}`,
              },
            });
            return;
          }
        }
        onMessage({
          method: message.method,
          params: message.params,
          id: message.id,
        });
        return;
      }
      if (typeof message.id !== 'number') return;
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(withStderr(message.error.message));
      else if ('result' in message) entry.resolve(message.result);
      else entry.reject(withStderr('Invalid app-server response.'));
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
      const graceful = setTimeout(() => terminate('SIGTERM'), 3000);
      const forced = setTimeout(() => terminate('SIGKILL'), 5000);
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
    respond: (id: string | number, result: unknown) => send({ id, result }),
    notify: (method: string) => send({ method }),
    close,
  };
}
