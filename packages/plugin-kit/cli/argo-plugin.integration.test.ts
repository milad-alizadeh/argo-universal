import { execFile, type ExecFileException } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../bin/argo-plugin.mjs', import.meta.url));

const plugin = fileURLToPath(new URL('../mocks/plugin/', import.meta.url));

type CommandResult = { code: string | number | null; output: string };

// A Plugin author runs the kit's command from the Plugin's own folder.
function argoPlugin(args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [bin, ...args],
      { timeout: 20_000, cwd: plugin },
      (error, output, stderr) => {
        resolve({ code: errorCode(error), output: output + stderr });
      },
    );
  });
}

function errorCode(error: ExecFileException | null): string | number {
  return error ? (error.code ?? 1) : 0;
}

it('validates the Plugin in the current folder', async () => {
  expect(await argoPlugin(['validate', '.'])).toMatchObject({
    code: 0,
    output: expect.stringContaining('Plugin is valid'),
  });
}, 30_000);

it('names itself in its usage line', async () => {
  expect(await argoPlugin([])).toMatchObject({
    code: 1,
    output: 'Usage: argo-plugin <validate|test> <dir>\n',
  });
}, 30_000);
