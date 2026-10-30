import { execFile, type ExecFileException } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onTestFinished } from 'vitest';

export const example = fileURLToPath(
  new URL('../../../plugins/examples/github-sign-in/', import.meta.url),
);

const testFile = /\.test\.[jt]s$/;

const cli = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

export async function fixture(source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-cli-plugin-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  // Each fixture brings its own tests, so the example's tests stay behind.
  await cp(example, directory, {
    recursive: true,
    filter: (path) => !testFile.test(path),
  });
  await writeFile(join(directory, 'index.tsx'), source);

  return directory;
}

type CommandResult = { code: string | number | null; output: string };

export function run(
  command: string,
  directory: string,
  timeout = 20_000,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [cli, 'plugin', command, directory],
      { timeout, cwd: tmpdir() },
      (error, output, stderr) =>
        resolve({ code: errorCode(error), output: output + stderr }),
    );
  });
}

function errorCode(error: ExecFileException | null): string | number {
  return error ? (error.code ?? 1) : 0;
}
