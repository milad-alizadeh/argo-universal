import { SHARE_ENV, Worker } from 'node:worker_threads';
import type { GitFailure, GitReply, GitRequest } from './git-thread';

type Waiting = {
  resolve: (stdout: string) => void;
  reject: (error: Error) => void;
};

const waiting = new Map<number, Waiting>();

let thread: Worker | undefined;

let lastId = 0;

const failed = (failure: GitFailure): Error =>
  Object.assign(new Error(failure.message), failure);

// The thread keeps the process running only while a command waits on it, as the git process itself used to.
const holdWhileWaiting = (worker: Worker): void => {
  if (waiting.size > 0) worker.ref();
  else worker.unref();
};

const answer = (call: Waiting, message: GitReply): void => {
  if ('failure' in message) call.reject(failed(message.failure));
  else call.resolve(message.stdout);
};

const settle = (message: GitReply): void => {
  const call = waiting.get(message.id);

  waiting.delete(message.id);

  if (thread) holdWhileWaiting(thread);

  if (call) answer(call, message);
};

// A thread that ends takes its commands with it; the next command starts a new one.
const threadEnded = (ended: Worker, error: Error): void => {
  if (thread !== ended) return;
  thread = undefined;

  for (const call of waiting.values()) call.reject(error);
  waiting.clear();
};

const startThread = (): Worker => {
  const worker = new Worker(new URL('./git-thread.ts', import.meta.url), {
    env: SHARE_ENV,
  });

  worker.on('message', settle);
  worker.on('error', (error): void => threadEnded(worker, error));
  worker.on('exit', (): void =>
    threadEnded(worker, new Error('The git thread stopped')),
  );

  return worker;
};

const send = (request: GitRequest): Worker => {
  thread ??= startThread();
  thread.postMessage(request);

  return thread;
};

const abortError = (signal: AbortSignal): Error =>
  Object.assign(
    new Error('The operation was aborted', { cause: signal.reason }),
    { name: 'AbortError', code: 'ABORT_ERR' },
  );

const run = (id: number, directory: string, args: string[]): Promise<string> =>
  new Promise<string>((resolve, reject): void => {
    waiting.set(id, { resolve, reject });
    holdWhileWaiting(send({ type: 'run', id, directory, args }));
  });

const nextId = (): number => {
  lastId += 1;

  return lastId;
};

const runUntilAborted = async (
  directory: string,
  args: string[],
  signal: AbortSignal,
): Promise<string> => {
  if (signal.aborted) throw abortError(signal);

  const id = nextId();
  const abort = (): void => void send({ type: 'abort', id });

  signal.addEventListener('abort', abort, { once: true });

  try {
    return await run(id, directory, args);
  } finally {
    signal.removeEventListener('abort', abort);
  }
};

// The one place git is spawned: in `directory`, with room for a large diff, stopped by `signal`. The spawn runs on its own thread, because starting a process blocks the thread that starts it.
export function git(
  directory: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  return signal
    ? runUntilAborted(directory, args, signal)
    : run(nextId(), directory, args);
}
