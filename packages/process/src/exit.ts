import type { ChildProcess } from 'node:child_process';

// How a child ended: its exit code, the signal that ended it, or the error that kept it from starting.
export interface Exit {
  code: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
}

// `exited` settles once; `ended` answers the same exit from then on, and undefined before.
export interface ExitWatch {
  exited: Promise<Exit>;
  ended: () => Exit | undefined;
}

// `code 1`, `signal SIGTERM`, or why it could not start.
export const describeExit = (exit: Exit): string =>
  exit.error?.message ?? describeEnd(exit);

const describeEnd = ({ code, signal }: Exit): string =>
  signal === null ? `code ${code}` : `signal ${signal}`;

// For a child this process did not start through `startChild`, such as Electron under Playwright.
export const hasExited = (child: ChildProcess): boolean =>
  child.exitCode !== null || child.signalCode !== null;

// True while a process with this pid can still be signalled.
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

// Asks a process to stop; one that has already exited needs nothing.
export function signalStop(pid: number): void {
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // It has already exited.
  }
}

// Settles when the child exits, or at once with the error when it never started.
const exitOf = (child: ChildProcess): Promise<Exit> =>
  new Promise<Exit>((resolve): void => {
    child.once('exit', (code, signal): void => resolve({ code, signal }));
    child.on('error', (error): void => {
      if (child.pid === undefined) resolve({ code: null, signal: null, error });
    });
  });

export function watchExit(child: ChildProcess): ExitWatch {
  let ended: Exit | undefined;

  const exited = exitOf(child).then((exit): Exit => {
    ended = exit;

    return exit;
  });

  return { exited, ended: (): Exit | undefined => ended };
}
