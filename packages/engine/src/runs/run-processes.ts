import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// The id travels in the shell's `$0`, which its command line shows, so recovery can tell a Run's group from a reused one.
export const runToken = (id: string): string => `argo-run-${id}`;

// Kills whatever still listens on the port after the group is gone; a dev server that detached from its group would hold it.
export const killPortListeners = async (port: number): Promise<void> => {
  const listeners = await run('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'])
    .then(({ stdout }) => stdout.split('\n').filter(Boolean).map(Number))
    .catch((): number[] => []);

  for (const pid of listeners)
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already gone.
    }
};

// Only a live group led by a process whose command line carries the Run's id is the Run's own.
export const ownsGroup = (pid: number, id: string): boolean => {
  try {
    return execFileSync(
      '/bin/ps',
      ['-p', String(pid), '-ww', '-o', 'pgid=,stat=,command='],
      { encoding: 'utf8' },
    )
      .split('\n')
      .some((line) => {
        const [group, state, ...command] = line.trim().split(/\s+/);

        return (
          Number(group) === pid &&
          !state?.startsWith('Z') &&
          command.join(' ').includes(runToken(id))
        );
      });
  } catch {
    return false;
  }
};
