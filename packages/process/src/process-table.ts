import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const processTableLimitBytes = 4_194_304;

const tableTimeoutMs = 8000;

// Reads a short-lived CPU and memory sample. Callers must never log the raw arguments.
export async function readProcessTable(): Promise<string> {
  const { stdout } = await exec(
    '/bin/ps',
    ['-axww', '-o', 'pid=,ppid=,pcpu=,rss=,command='],
    {
      timeout: tableTimeoutMs,
      maxBuffer: processTableLimitBytes,
      env: { LC_ALL: 'C' },
    },
  );

  return stdout;
}
