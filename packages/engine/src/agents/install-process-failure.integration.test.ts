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

it.each([
  ['an Agent', {}, 'the Agent'],
  ['a tool', { subject: 'Node.js' }, 'Node.js'],
])(
  'a real installer that fails while installing %s names it, with its own reason',
  async (_, subject, named) => {
    await expect(
      runInstallTool({
        executable: process.execPath,
        args: ['-e', failingInstaller],
        cwd: directory,
        signal: new AbortController().signal,
        ...subject,
      }),
    ).rejects.toThrow(`failed to install ${named}: no bottle`);
  },
);
