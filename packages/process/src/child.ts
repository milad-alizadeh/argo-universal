import {
  spawn,
  type ChildProcess,
  type Serializable,
  type StdioOptions,
} from 'node:child_process';
import { childEnvironment, nodeExecutable } from './environment';
import { type Exit, watchExit } from './exit';
import { type GroupRelease, supportsProcessGroups } from './group';
import type { Check } from './poll';
import { recordOutputTail, waitUntilReady } from './ready';
import { stopChild, stopGroupMember } from './stop';

// What a child sends over its IPC channel, before the receiver parses it.
export type ChildMessage = Serializable;

// A Node script to run as a child process.
export interface ChildCommand {
  // Names the process in errors: "The <label> exited (code 1)".
  label: string;
  entry: string;
  args?: readonly string[];
  // Node options before the entry, such as `--import tsx`.
  execArgv?: readonly string[];
  cwd?: string;
  // Laid over the parent's environment; an undefined value removes a variable.
  env?: NodeJS.ProcessEnv;
}

export interface ChildOptions {
  // Opens an IPC channel for `onMessage`.
  messages?: boolean;
  // `inherit` shares the parent's output; `tail` keeps the end of stdout and stderr for errors.
  output?: 'inherit' | 'tail';
  /*
   * `own` (the default) leads a new process group, so a stop also ends what the child launched.
   * `caller` stays in this process's group, so a kill of that group (Ctrl+C, a test runner's) ends the child too;
   * a stop then kills only the child and answers `unresolved`.
   */
  group?: 'own' | 'caller';
}

// A started child.
export interface ChildHandle {
  readonly pid: number | undefined;
  // Settles once, when the child exits or fails to start.
  readonly exited: Promise<Exit>;
  onMessage: (listener: (message: ChildMessage) => void) => () => void;
  // Polls `check` every pollIntervalMs until it answers; rejects when the child exits first or startLimitMs passes.
  waitUntil: <T>(check: Check<T>) => Promise<T>;
  // The end of stdout and stderr together, with `output: 'tail'`.
  outputTail: () => string;
  // SIGTERM, the group (or a `caller` child alone) killed after `graceMs`, then `released` once no member of the group is left.
  stop: (graceMs: number) => Promise<GroupRelease>;
}

const nodeArguments = (command: ChildCommand): string[] => [
  ...(command.execArgv ?? []),
  command.entry,
  ...(command.args ?? []),
];

const childStdio = (options: ChildOptions): StdioOptions => [
  ...(options.output === 'tail'
    ? (['ignore', 'pipe', 'pipe'] as const)
    : (['inherit', 'inherit', 'inherit'] as const)),
  ...(options.messages ? (['ipc'] as const) : []),
];

const listenTo =
  (child: ChildProcess): ChildHandle['onMessage'] =>
  (listener) => {
    child.on('message', listener);

    return (): void => void child.off('message', listener);
  };

type Spawning = { detached: boolean; stdio: StdioOptions };

type Stop = typeof stopChild;

const spawnNode = (command: ChildCommand, spawning: Spawning): ChildProcess =>
  spawn(nodeExecutable(), nodeArguments(command), {
    cwd: command.cwd,
    env: childEnvironment(command.env),
    ...spawning,
  });

function handle(label: string, child: ChildProcess, stop: Stop): ChildHandle {
  const exit = watchExit(child);
  const outputTail = recordOutputTail(child);

  return {
    pid: child.pid,
    exited: exit.exited,
    onMessage: listenTo(child),
    waitUntil: (check) => waitUntilReady({ label, ...exit, outputTail }, check),
    outputTail,
    stop: (graceMs) => stop(child, exit, graceMs),
  };
}

const ownsGroup = (options: ChildOptions): boolean =>
  supportsProcessGroups && options.group !== 'caller';

// Starts a child this process owns and stops, in the process group `options.group` picks.
export function startChild(
  command: ChildCommand,
  options: ChildOptions = {},
): ChildHandle {
  const ownGroup = ownsGroup(options);

  const child = spawnNode(command, {
    detached: ownGroup,
    stdio: childStdio(options),
  });

  return handle(command.label, child, ownGroup ? stopChild : stopGroupMember);
}

/*
 * Starts a long-lived service that may outlive this process: detached in its own group,
 * its output discarded so a closed parent cannot break its pipes, with an IPC channel that keeps neither process alive.
 */
export function startService(command: ChildCommand): ChildHandle {
  const child = spawnNode(command, {
    detached: true,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });

  child.unref();
  child.channel?.unref();

  return handle(command.label, child, stopChild);
}
