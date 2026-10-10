import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Interface } from 'node:readline';
import { describeError } from '../src/describe-error';
import { findExecutable } from '../src/find-executable';
export const EXECUTABLE = 'codex';
const stderrTailLength = 2000;
const gracefulStopLimitMs = 3000;
const forcedStopLimitMs = 5000;
const environmentWithoutKeys = (): NodeJS.ProcessEnv => {
  const environment = { ...process.env };
  delete environment.OPENAI_API_KEY;
  delete environment.CODEX_API_KEY;
  return environment;
};
const startProcess = (cwd: string): ChildProcessWithoutNullStreams => {
  const executable = findExecutable(EXECUTABLE, process.env);
  if (!executable) throw new Error('Codex is not installed.');
  return spawn(executable, ['app-server', '--listen', 'stdio://'], {
    cwd,
    env: environmentWithoutKeys(),
    stdio: 'pipe',
    detached: process.platform !== 'win32',
  });
};
const pendingRequests = (): Map<
  number,
  { resolve: (result: unknown) => void; reject: (error: Error) => void }
> => new Map();
export interface ProcessState {
  child: ChildProcessWithoutNullStreams;
  pending: ReturnType<typeof pendingRequests>;
  nextId: number;
  stderrTail: string;
  stopping: boolean;
  failed: boolean;
  closing: Promise<void> | undefined;
}
export const createProcessState = (cwd: string): ProcessState => ({
  child: startProcess(cwd),
  pending: pendingRequests(),
  nextId: 0,
  stderrTail: '',
  stopping: false,
  failed: false,
  closing: undefined,
});
export const withStderr = (state: ProcessState, error: unknown): Error =>
  new Error(
    [describeError(error), state.stderrTail.trim()].filter(Boolean).join('\n'),
  );
export const failProcess = (
  state: ProcessState,
  error: unknown,
  onFailure: (error: unknown) => void,
): void => {
  if (state.failed) return;
  state.failed = true;
  const failure = withStderr(state, error);
  for (const entry of state.pending.values()) entry.reject(failure);
  state.pending.clear();
  reportFailure(state, failure, onFailure);
};
export const watchProcess = (
  state: ProcessState,
  onFailure: (error: unknown) => void,
): Promise<void> => {
  const fail = (error: unknown): void => failProcess(state, error, onFailure);
  watchStderr(state);
  state.child.on('error', fail);
  state.child.stdin.on('error', fail);
  return new Promise((resolve): void => {
    state.child.once('close', (code, signal): void => {
      fail(`The Codex CLI exited (${signal ?? code}).`);
      resolve();
    });
  });
};
const terminate = (state: ProcessState, signal: NodeJS.Signals): void => {
  if (!state.child.pid) return;
  try {
    signalProcess(state.child, signal);
  } catch {}
};
const stopProcess = async (
  state: ProcessState,
  exited: Promise<void>,
): Promise<void> => {
  state.stopping = true;
  state.child.stdin.end();
  const clearTimers = terminationTimers(state);
  await exited;
  clearTimers();
};
const closingProcess = (
  state: ProcessState,
  exited: Promise<void>,
): Promise<void> => (state.closing ??= stopProcess(state, exited));
export const closeLines = async (input: {
  state: ProcessState;
  exited: Promise<void>;
  lines: Interface;
  signal: AbortSignal;
  abort: () => void;
}): Promise<void> => {
  await closingProcess(input.state, input.exited);
  input.lines.close();
  input.signal.removeEventListener('abort', input.abort);
};

const watchStderr = (state: ProcessState): void => {
  state.child.stderr.on('data', (text): void => {
    state.stderrTail = (state.stderrTail + text.toString()).slice(
      -stderrTailLength,
    );
  });
};

const reportFailure = (
  state: ProcessState,
  failure: Error,
  onFailure: (error: unknown) => void,
): void => {
  if (!state.stopping) onFailure(failure);
};

const signalProcess = (
  child: ProcessState['child'],
  signal: NodeJS.Signals,
): void => {
  if (process.platform === 'win32') child.kill(signal);
  else if (child.pid) process.kill(-child.pid, signal);
};

const terminationTimers = (state: ProcessState): (() => void) => {
  const graceful = setTimeout(
    (): void => terminate(state, 'SIGTERM'),
    gracefulStopLimitMs,
  );
  const forced = setTimeout(
    (): void => terminate(state, 'SIGKILL'),
    forcedStopLimitMs,
  );
  return (): void => {
    clearTimeout(graceful);
    clearTimeout(forced);
  };
};
