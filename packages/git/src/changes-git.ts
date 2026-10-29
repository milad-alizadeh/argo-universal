import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const gitOutputLimit = 33_554_432;

export async function git(checkout: string, args: string[]): Promise<string> {
  const { stdout } = await execute('git', ['-C', checkout, ...args], {
    maxBuffer: gitOutputLimit,
  });

  return stdout;
}

export async function gitDiffNoIndex(
  checkout: string,
  args: string[],
): Promise<string> {
  try {
    return await git(checkout, ['diff', '--no-index', ...args]);
  } catch (error) {
    if (isDiffResult(error)) return String(error.stdout);
    throw error;
  }
}

function isDiffResult(
  error: unknown,
): error is Error & { code: number; stdout: unknown } {
  return error instanceof Error && diffError(error) && 'stdout' in error;
}

function diffError(error: Error): boolean {
  return 'code' in error && error.code === 1;
}
