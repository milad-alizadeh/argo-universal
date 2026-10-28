import { execFile, type ExecFileException } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const bin = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

function run(
  args: string[],
): Promise<{ code: string | number; output: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [bin, ...args],
      { timeout: 20_000 },
      (error: ExecFileException | null, stdout, stderr) => {
        resolve({ code: error?.code ?? 0, output: stdout + stderr });
      },
    );
  });
}

it.each([[], ['--help'], ['unknown']])(
  'prints commands for %j',
  async (...args) => {
    const result = await run(args);
    expect(result).toEqual({
      code: args[0] === 'unknown' ? 2 : 0,
      output:
        'Usage: argo <command>\n\nCommands:\n  server [--watch]            Start the Server\n  plugin <validate|test> <dir>  Validate or test a Plugin\n',
    });
  },
  30_000,
);
