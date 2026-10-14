import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { runInstallTool } from './install/processes/process';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'install-failure-'));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

const failingInstaller = "console.error('no bottle'); process.exit(1)";

it('a real installer that fails names the Agent, with its own reason', async () => {
  await expect(
    runInstallTool({
      executable: process.execPath,
      args: ['-e', failingInstaller],
      cwd: directory,
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow('failed to install the Agent: no bottle');
});
