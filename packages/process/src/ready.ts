import type { ChildProcess } from 'node:child_process';
import { describeExit, type Exit } from './exit';
import { type Check, pollUntil } from './poll';

export const outputTailLength = 2000;

export type Watched = {
  label: string;
  ended: () => Exit | undefined;
  outputTail: () => string;
};

// The end of what the child wrote to stdout and stderr together: the Engine logs to stdout, a crash goes to stderr.
export function recordOutputTail(child: ChildProcess): () => string {
  let tail = '';

  const keep = (chunk: Buffer): void => {
    tail = (tail + chunk.toString()).slice(-outputTailLength);
  };

  child.stdout?.on('data', keep);
  child.stderr?.on('data', keep);

  return (): string => tail;
}

const whileRunning =
  <T>({ label, ended }: Watched, check: Check<T>): Check<T> =>
  () => {
    const exit = ended();

    if (exit) throw new Error(`The ${label} exited (${describeExit(exit)})`);

    return check();
  };

const withOutput = (error: Error, tail: string): Error =>
  tail === ''
    ? error
    : new Error(
        `${error.message}\noutput (last ${outputTailLength} characters):\n${tail}`,
        { cause: error },
      );

// Polls `check` until it answers; fails at once when the child exits, and at the start limit otherwise, with the end of its output.
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
    throw withOutput(error, watched.outputTail());
  }
}
