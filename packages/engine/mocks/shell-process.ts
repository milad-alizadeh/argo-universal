import { execFileSync } from 'node:child_process';
import type { ShellOutput } from '@repo/contracts';

export const descendantPid = async (
  output: AsyncIterable<ShellOutput>,
): Promise<number> => {
  for await (const chunk of output) {
    const match = chunk.text.match(/descendant:(\d+)/);

    if (match) return Number(match[1]);
  }

  throw new Error('The Shell did not report its descendant');
};

export const processIsRunning = (pid: number): boolean => {
  try {
    return !execFileSync('/bin/ps', ['-p', String(pid), '-o', 'stat='], {
      encoding: 'utf8',
    })
      .trim()
      .startsWith('Z');
  } catch {
    return false;
  }
};
