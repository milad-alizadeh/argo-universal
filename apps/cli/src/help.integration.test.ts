import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { runCli } from '../mocks/cli-process';

function temporaryRuntime(): string {
  const home = mkdtempSync(join(tmpdir(), 'cli-help-'));
  onTestFinished(() => rmSync(home, { recursive: true, force: true }));

  return home;
}

it.each([[], ['--help'], ['unknown']])(
  'prints commands for %j',
  async (...args) => {
    const result = await runCli(temporaryRuntime(), args);
    expect(result).toEqual({
      code: args[0] === 'unknown' ? 2 : 0,
      stdout:
        "Usage: argo <command>\n\nCommands:\n  operations [filter] [--json]  Find available Operations\n  run <id> [--params '<json>'] [--wait]  Run an Operation\n  wait <id>                   Wait for native Session work\n  mcp                         Serve Argo tools over MCP on stdio\n  server [--watch]            Start the Server\n  plugin <validate|test> <dir>  Validate or test a Plugin\n",
      stderr: '',
    });
  },
  30_000,
);

it.each([['--unknown'], ['--watch=yes'], ['unexpected']])(
  'server rejects malformed arguments %j with usage code 2',
  async (...args) => {
    const result = await runCli(temporaryRuntime(), ['server', ...args]);

    expect(result).toMatchObject({
      code: 2,
      stdout: '',
      stderr: expect.any(String),
    });
  },
  30_000,
);
