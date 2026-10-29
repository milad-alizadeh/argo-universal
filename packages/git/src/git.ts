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
  });

  return stdout;
}
