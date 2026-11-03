import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const outputLimit = 33_554_432;

// The one place git is spawned: in `directory`, with room for a large diff, stopped by `signal`.
export async function git(
  directory: string,
  args: string[],
  signal?: AbortSignal,
): Promise<string> {
  const { stdout } = await execute('git', ['-C', directory, ...args], {
    maxBuffer: outputLimit,
    signal,
    // No git command waits on a person: a remote that asks for a password fails instead of hanging.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });

  return stdout;
}
