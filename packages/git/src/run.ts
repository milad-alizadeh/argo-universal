import type { PromiseWithChild } from 'child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export const run = (
  arguments_: string[],
  signal?: AbortSignal,
): PromiseWithChild<{
  stdout: string;
  stderr: string;
}> => execute('git', arguments_, { signal });
