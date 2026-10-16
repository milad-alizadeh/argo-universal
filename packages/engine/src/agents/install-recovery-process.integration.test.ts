import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { reconcileInterruptedInstallations } from './index';
import { runInstallTool } from './install/processes/process';
import { InstallerGroupRecord } from './install/processes/process-record';

const installerRecordFile = '.installer-group.json';

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
    await writeFile(join(staging, installerRecordFile), JSON.stringify(record));
    await expect(reconcileInterruptedInstallations(home)).rejects.toThrow(
      'identity changed',
    );
    expect(process.kill(child.pid, 0)).toBe(true);
    expect(
      JSON.parse(await readFile(join(staging, installerRecordFile), 'utf8')),
    ).toEqual(record);
  } finally {
    process.kill(-child.pid, 'SIGKILL');
    await exited;
    await rm(home, { recursive: true, force: true });
  }
});

it.each([
  { scope: 'npx', operation: 'fixture', retained: true },
  { scope: 'fixture', operation: '.staging-operation', retained: false },
  { scope: '.probes', operation: '.probe-operation', retained: false },
])(
  'restart releases a stopped Registry installer in $scope/$operation',
  async ({ scope, operation, retained }) => {
    const home = await mkdtemp(join(tmpdir(), 'argo-registry-recovery-'));
    const directory = join(home, 'agents', 'registry', scope, operation);
    await mkdir(directory, { recursive: true });
    const controller = new AbortController();

    const tool = runInstallTool({
      executable: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd: directory,
      signal: controller.signal,
    }).catch(() => {});

    let pid: number | undefined;

    try {
      const ownedPid = await vi.waitFor(
        async (): Promise<number> =>
          InstallerGroupRecord.parse(
            JSON.parse(
              await readFile(join(directory, installerRecordFile), 'utf8'),
            ),
          ).pid,
      );

      pid = ownedPid;
      process.kill(pid, 'SIGSTOP');
      await reconcileInterruptedInstallations(home);
      expect(() => process.kill(ownedPid, 0)).toThrow('ESRCH');
      expect(existsSync(join(directory, installerRecordFile))).toBe(false);

      expect(existsSync(directory)).toBe(retained);
    } finally {
      controller.abort();

      if (pid) {
        try {
          process.kill(pid, 'SIGCONT');
        } catch {}
      }

      await tool;
      await rm(home, { recursive: true, force: true });
    }
  },
);

it.each([
  ['agents', 'archive-hash', 'package', 'sub'],
  ['agents', 'registry', 'fixture', 'v_1.2.3'],
])(
  'restart ignores an ownership record inside installed content at %s/%s/%s/%s',
  async (...segments) => {
    const home = await mkdtemp(join(tmpdir(), 'argo-installed-content-'));
    const content = join(home, ...segments);

    try {
      await mkdir(content, { recursive: true });
      await writeFile(join(content, installerRecordFile), '{junk');
      await expect(
        reconcileInterruptedInstallations(home),
      ).resolves.toBeUndefined();
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  },
);
