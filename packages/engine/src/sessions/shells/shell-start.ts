import type { Readable, Writable } from 'node:stream';
import { agentEnvironment } from '../../agents';
import type { ShellCommandInput } from './shell-command';
import type { Serializable } from './shell-launch';
import type { ShellChild } from './shell-launch';

export const shellPid = (child: ShellChild): number => {
  if (!child.pid) throw new Error('Shell wrapper has no pid');

  return child.pid;
};

export function requireShellPipe<Pipe extends Readable | Writable>(
  pipe: Pipe | null,
): asserts pipe is Pipe {
  if (!pipe) throw new Error('Shell pipes are unavailable');
}

export const shellEnvironment = async (
  input: ShellCommandInput,
): Promise<NodeJS.ProcessEnv> => {
  const env = await agentEnvironment(input.launch);

  for (const { name, value } of input.request.env ?? []) env[name] = value;

  return env;
};

type ShellLaunchMessage = {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
};

export const shellLaunchMessage = (
  input: ShellCommandInput,
  env: NodeJS.ProcessEnv,
): ShellLaunchMessage => ({
  command: input.request.command,
  args: input.request.args ?? [],
  cwd: input.request.cwd ?? input.cwd,
  env,
});

export const sendShellLaunch = (
  child: ShellChild,
  message: Serializable,
): Promise<void> =>
  new Promise((resolve, reject) => {
    child.send(message, (error) => (error ? reject(error) : resolve()));
  });
