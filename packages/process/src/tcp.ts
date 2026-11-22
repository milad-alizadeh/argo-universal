import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const inspect = promisify(execFile);

export async function killPortListeners(port: number): Promise<void> {
  const listeners = await inspect('lsof', [
    '-ti',
    `tcp:${port}`,
    '-sTCP:LISTEN',
  ])
    .then(({ stdout }) => stdout.split('\n').map(Number))
    .catch((): number[] => []);

  for (const pid of listeners.filter((id) => Number.isInteger(id) && id > 0))
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // The listener may have already exited.
    }
}
