import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Readable, Writable } from 'node:stream';
import {
  observeShellCommand,
  type ShellCommand,
  type ShellCommandInput,
} from './shell-command';
import { shellEnvironment, requireShellPipe } from './shell-start';
import { shellWrapper } from './shell-wrapper';

export type { Serializable } from 'node:child_process';

export type ShellChild = ChildProcess & {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
};

export const launchShellCommand = async (
  input: ShellCommandInput,
): Promise<ShellCommand> => {
  if (process.platform === 'win32')
    throw new Error('Shell process groups are unavailable');
  const token = randomUUID();
  const env = await shellEnvironment(input);

  return observeShellCommand(spawnShellCommand(input, token), input, {
    token,
    env,
  });
};

const spawnShellCommand = (
  input: ShellCommandInput,
  token: string,
): ShellChild => {
  const child = spawn(process.execPath, ['-e', shellWrapper, '--', token], {
    cwd: input.request.cwd ?? input.cwd,
    env: { NODE_ENV: process.env.NODE_ENV },
    detached: true,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  return withShellPipes(child);
};

const withShellPipes = (child: ReturnType<typeof spawn>): ShellChild => {
  requireShellPipe(child.stdin);
  requireShellPipe(child.stdout);
  requireShellPipe(child.stderr);

  return Object.assign(child, {
    stdin: child.stdin,
    stdout: child.stdout,
    stderr: child.stderr,
  });
};
