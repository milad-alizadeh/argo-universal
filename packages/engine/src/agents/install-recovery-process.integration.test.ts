import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { reconcileInterruptedInstallations } from './index';

it('restart retains staging rather than signaling a reused process group', async () => {
  const home = await mkdtemp(join(tmpdir(), 'argo-installer-record-'));
  const staging = join(home, 'agents', 'scope', '.install-operation');
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  });
  const exited = new Promise<void>((resolve) =>
    child.once('exit', () => resolve()),
  );
  if (!child.pid) throw new Error('Unrelated process did not start');
  try {
    await mkdir(staging, { recursive: true });
    const record = { pid: child.pid, token: randomUUID() };
    await writeFile(
      join(staging, '.installer-group.json'),
      JSON.stringify(record),
    );
    await expect(reconcileInterruptedInstallations(home)).rejects.toThrow(
      'identity changed',
    );
    expect(process.kill(child.pid, 0)).toBe(true);
    expect(
      JSON.parse(
        await readFile(join(staging, '.installer-group.json'), 'utf8'),
      ),
    ).toEqual(record);
  } finally {
    process.kill(-child.pid, 'SIGKILL');
    await exited;
    await rm(home, { recursive: true, force: true });
  }
});
