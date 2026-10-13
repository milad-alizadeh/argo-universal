import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { runInstallTool } from './install/processes/process';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'install-process-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const lifetimeScript = fileURLToPath(
  new URL('../../mocks/installation-lifetime.mjs', import.meta.url),
);

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

it('normal installer exit cleans descendants retaining its output pipes before completion', async () => {
  const controller = new AbortController();

  const script = `
    const {spawn} = require('node:child_process');
    const {writeFileSync} = require('node:fs');
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    writeFileSync('descendant', String(child.pid));
    child.unref();
    process.exit(0);
  `;

  const result = runInstallTool({
    executable: process.execPath,
    args: ['-e', script],
    cwd: directory,
    signal: controller.signal,
  });

  try {
    await result;
    expect(
      isAlive(Number(await readFile(join(directory, 'descendant'), 'utf8'))),
    ).toBe(false);
  } finally {
    controller.abort(new Error('test cleanup'));
    await result.catch(() => {});
  }
});

it('cancellation settles after the real installer and its child exit', async () => {
  const controller = new AbortController();

  const result = runInstallTool({
    executable: process.execPath,
    args: [lifetimeScript],
    cwd: directory,
    signal: controller.signal,
  }).catch((cause: unknown) => cause);

  await expect
    .poll(async () => readFile(join(directory, 'ready'), 'utf8'))
    .toMatch(/^\d+,\d+$/);

  const pids = (await readFile(join(directory, 'ready'), 'utf8'))
    .split(',')
    .map(Number);

  controller.abort(new Error('cancelled'));
  expect(await result).toMatchObject({ message: 'cancelled' });
  expect(pids.map(isAlive)).toEqual([false, false]);
});

it('reports a missing runtime after the real spawn fails', async () => {
  await expect(
    runInstallTool({
      executable: join(directory, 'missing-tool'),
      args: [],
      cwd: directory,
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('required on the Server');
});

it('bounds binary decompression output before writing a managed archive', async () => {
  const outputFile = join(directory, 'archive');
  await expect(
    runInstallTool({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write(Buffer.alloc(4096))'],
      cwd: directory,
      signal: new AbortController().signal,
      outputFile,
      outputLimit: 1024,
    }),
  ).rejects.toThrow('output exceeded its budget');
  await expect(readFile(outputFile)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('preserves binary decompression bytes without UTF-8 conversion', async () => {
  const outputFile = join(directory, 'archive');
  await runInstallTool({
    executable: process.execPath,
    args: ['-e', 'process.stdout.write(Buffer.from([0, 255, 128, 1]))'],
    cwd: directory,
    signal: new AbortController().signal,
    outputFile,
  });
  expect(await readFile(outputFile)).toEqual(Buffer.from([0, 255, 128, 1]));
});

it.each([
  'No interpreter found; install Python on the Server',
  '\u001b[31mNo interpreter found; install Python on the Server\u001b[0m\u0000',
])(
  'reports the external Python prerequisite diagnostic without terminal controls: %s',
  async (diagnostic) => {
    await expect(
      runInstallTool({
        executable: process.execPath,
        args: [
          '-e',
          `process.stderr.write(${JSON.stringify(diagnostic)}); process.exitCode = 2`,
        ],
        cwd: directory,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('No interpreter found; install Python on the Server');
  },
);
