import type { ChildProcess } from 'node:child_process';
import { describeExit, type Exit } from './exit';
import { type Check, pollUntil } from './poll';

export const stderrTailLength = 2000;

export type Watched = {
  label: string;
  ended: () => Exit | undefined;
  stderrTail: () => string;
};

export function recordStderrTail(child: ChildProcess): () => string {
  let tail = '';

  child.stderr?.on('data', (chunk: Buffer): void => {
    tail = (tail + chunk.toString()).slice(-stderrTailLength);
  });

  return (): string => tail;
}

const whileRunning =
  <T>({ label, ended }: Watched, check: Check<T>): Check<T> =>
  () => {
    const exit = ended();

    if (exit) throw new Error(`The ${label} exited (${describeExit(exit)})`);

    return check();
  };

const withStderr = (error: Error, tail: string): Error =>
  tail === ''
    ? error
    : new Error(
        `${error.message}\nstderr (last ${stderrTailLength} characters):\n${tail}`,
        { cause: error },
      );

// Polls `check` until it answers; fails at once when the child exits, and at the start limit otherwise, with the end of its stderr.
export async function waitUntilReady<T>(
  watched: Watched,
  check: Check<T>,
): Promise<T> {
  try {
    return await pollUntil(
      whileRunning(watched, check),
      `The ${watched.label} did not start`,
    );
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    throw withStderr(error, watched.stderrTail());
  }
}
