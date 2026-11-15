import { fork, type ChildProcess } from 'node:child_process';
import { GitReply, type GitFailure, type GitRequest } from './git-messages';

type Waiting = {
  resolve: (stdout: string) => void;
  reject: (error: Error) => void;
};

const waiting = new Map<number, Waiting>();

let runner: ChildProcess | undefined;

let lastId = 0;

const failed = (failure: GitFailure): Error =>
  Object.assign(new Error(failure.message), failure);

const hold = (child: ChildProcess): void => {
  child.ref();
  child.channel?.ref();
};

const release = (child: ChildProcess): void => {
  child.unref();
  child.channel?.unref();
};

// The git process keeps this one running only while a command waits on it, as a git command started here would.
const holdWhileWaiting = (child: ChildProcess): void => {
  if (waiting.size > 0) hold(child);
  else release(child);
};

const answer = (call: Waiting, message: GitReply): void => {
  if ('failure' in message) call.reject(failed(message.failure));
  else call.resolve(message.stdout);
};

const settle = (message: GitReply): void => {
  const call = waiting.get(message.id);

  waiting.delete(message.id);

  if (runner) holdWhileWaiting(runner);

  if (call) answer(call, message);
};

// A git process that ends takes its commands with it; the next command starts a new one.
const runnerEnded = (ended: ChildProcess, error: Error): void => {
  if (runner !== ended) return;
  runner = undefined;

  for (const call of waiting.values()) call.reject(error);
  waiting.clear();
};

/*
 * `node --watch` (the dev Server) sets WATCH_REPORT_DEPENDENCIES so every descendant reports each import to its parent over IPC as
 * `watch:*` messages. This IPC carries git answers, so the git process must not inherit it.
 */
const runnerEnvironment = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };

  delete env.NODE_OPTIONS;
  delete env.WATCH_REPORT_DEPENDENCIES;

  return env;
};

const startRunner = (): ChildProcess => {
  const child = fork(new URL('./git-runner.ts', import.meta.url), [], {
    execArgv: [],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    env: runnerEnvironment(),
    serialization: 'advanced',
  });

  child.on('message', (raw): void => settle(GitReply.parse(raw)));
  child.on('error', (error): void => runnerEnded(child, error));
  child.on('exit', (): void =>
    runnerEnded(child, new Error('The git process stopped')),
  );

  return child;
};

// A request to a git process that has just ended is answered by its exit, not by this error.
const send = (request: GitRequest): ChildProcess => {
  runner ??= startRunner();
  runner.send(request, (): void => {});

  return runner;
};

const abortError = (signal: AbortSignal): Error =>
  Object.assign(
    new Error('The operation was aborted', { cause: signal.reason }),
    { name: 'AbortError', code: 'ABORT_ERR' },
  );

const run = (id: number, directory: string, args: string[]): Promise<string> =>
  new Promise<string>((resolve, reject): void => {
    waiting.set(id, { resolve, reject });
    // No git command waits on a person: a remote that asks for a password fails instead of hanging.
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

    holdWhileWaiting(send({ type: 'run', id, directory, args, env }));
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

/*
 * The one place git is run: in `directory`, with room for a large diff, stopped by `signal`.
 * One long-lived git process starts every command, because starting a process blocks the thread that starts it. It is a process and not a thread: a command started from a second thread holds this process's open sockets until it has started, so a listener closed meanwhile cannot be opened again.
 */
export function git(
  directory: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  return signal
    ? runUntilAborted(directory, args, signal)
    : run(nextId(), directory, args);
}
