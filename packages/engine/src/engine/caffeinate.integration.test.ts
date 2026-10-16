import { execFile, fork } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it, onTestFinished } from 'vitest';
import { caffeinate } from './caffeinate';

const execute = promisify(execFile);

async function processes(): Promise<string[]> {
  const { stdout } = await execute('ps', ['-axo', 'pid=,ppid=,command=']);

  return stdout.split('\n');
}

it.skipIf(process.platform === 'darwin')(
  'caffeinate is a callable no-op off macOS',
  () => {
    const release = caffeinate(process.pid);
    expect(release()).toBeUndefined();
  },
);

it.runIf(process.platform === 'darwin').each(['release', 'owner exit'])(
  'native caffeinate uses only idle-sleep inhibition and exits after %s',
  async (ending) => {
    const owner = fork(
      new URL('../../mocks/caffeinate-owner.mjs', import.meta.url),
      {
        stdio: 'ignore',
      },
    );

    onTestFinished(() => {
      owner.kill('SIGKILL');
    });

    const childPattern = new RegExp(
      `^\\s*(\\d+)\\s+${owner.pid}\\s+/usr/bin/caffeinate `,
    );

    await expect
      .poll(async () =>
        (await processes()).filter((line) => childPattern.test(line)),
      )
      .toHaveLength(1);
    const child = (await processes()).find((line) => childPattern.test(line));
    expect(child).toContain(`/usr/bin/caffeinate -i -w ${owner.pid}`);

    if (!child) throw new Error('Missing caffeinate child');
    const childPid = Number(child.trim().split(/\s+/)[0]);
    const pidPattern = new RegExp(`^\\s*${childPid}\\s`);

    if (ending === 'release') owner.send('release');
    else owner.kill('SIGKILL');

    await expect
      .poll(async () =>
        (await processes()).some((line) => pidPattern.test(line)),
      )
      .toBe(false);
  },
);
