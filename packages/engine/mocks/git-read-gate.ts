import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { delimiter, join } from 'node:path';
import { promisify } from 'node:util';
import { expect, onTestFinished, vi } from 'vitest';

const execute = promisify(execFile);

type Gate = { started: () => Promise<void>; release: () => Promise<void> };

export async function holdProjectReads(home: string): Promise<Gate> {
  return holdGitReads(home, 'get-url');
}

export async function holdBranchReads(home: string): Promise<Gate> {
  return holdGitReads(home, 'for-each-ref');
}

async function holdGitReads(home: string, argument: string): Promise<Gate> {
  const { stdout } = await execute('which', ['git']);
  const directory = join(home, 'git-read-gate');
  await mkdir(directory);
  const entered = join(directory, 'entered');
  const released = join(directory, 'released');
  await writeFile(
    join(directory, 'git'),
    gitGateSource({ executable: stdout.trim(), entered, released, argument }),
    { mode: 0o755 },
  );
  const release = (): Promise<void> => writeFile(released, 'released');

  onTestFinished(async () => {
    await release();
    vi.unstubAllEnvs();
  });
  vi.stubEnv('PATH', `${directory}${delimiter}${process.env.PATH ?? ''}`);

  return { release, started: () => waitForRead(entered) };
}

async function waitForRead(path: string): Promise<void> {
  await expect.poll(() => readFile(path, 'utf8')).toBe('reading');
}

function gitGateSource(input: {
  executable: string;
  entered: string;
  released: string;
  argument: string;
}): string {
  return `#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { existsSync, writeFileSync } = require('node:fs');
const input = ${JSON.stringify(input)};
const run = () => {
  const child = spawn(input.executable, process.argv.slice(2), { stdio: 'inherit' });
  child.once('error', () => process.exit(1));
  child.once('exit', (code) => process.exit(code ?? 1));
};
if (!process.argv.includes(input.argument) || existsSync(input.released)) run();
else {
  writeFileSync(input.entered, 'reading');
  const timer = setInterval(() => { if (!existsSync(input.entered)) process.exit(1); if (!existsSync(input.released)) return; clearInterval(timer); run(); }, 10);
}
`;
}
