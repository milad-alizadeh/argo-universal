import { spawn } from 'node:child_process';
import { expect, it, onTestFinished } from 'vitest';
import { isAlive, releaseProcessGroup } from './index';

// A group leader that launches a descendant and then dies without cleaning it up, as an abruptly killed process does.
async function startOrphanedGroup(): Promise<{
  leader: number;
  child: number;
}> {
  const leader = spawn(
    process.execPath,
    [
      '-e',
      `const { spawn } = require('node:child_process');
       const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
       process.stdout.write(String(child.pid) + '\\n');
       setInterval(() => {}, 1000);`,
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
  );

  const leaderPid = leader.pid;

  if (leaderPid === undefined) throw new Error('The leader did not start');
  onTestFinished((): void => {
    try {
      process.kill(-leaderPid, 'SIGKILL');
    } catch {}
  });

  const child = await new Promise<number>((resolve): void => {
    leader.stdout.once('data', (chunk: Buffer): void =>
      resolve(Number(chunk.toString().trim())),
    );
  });

  const exited = new Promise<void>((resolve): void => {
    leader.once('exit', (): void => resolve());
  });

  process.kill(leaderPid, 'SIGKILL');
  await exited;

  return { leader: leaderPid, child };
}

it('releasing the group of a dead leader kills the descendants it left running', async () => {
  const { leader, child } = await startOrphanedGroup();
  expect(isAlive(child)).toBe(true);
  await expect(releaseProcessGroup(leader)).resolves.toBe('released');
  expect(isAlive(child)).toBe(false);
});

it('releasing a group whose leader exited and left nothing reports it released', async () => {
  const leader = spawn(process.execPath, ['-e', ''], { detached: true });
  const pid = leader.pid;

  if (pid === undefined) throw new Error('The leader did not start');
  await new Promise<void>((resolve): void => {
    leader.once('exit', (): void => resolve());
  });
  await expect(releaseProcessGroup(pid)).resolves.toBe('released');
});
