import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import { executeCli } from '../mocks/cli-process';

const bin = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

const recorder = fileURLToPath(
  new URL('../mocks/loaded-modules.mjs', import.meta.url),
);

const usageExitCode = 2;

const processLimitMs = 60_000;

// Runs `argo` with a usage error, so it stops before reaching a Server, and answers the modules it loaded.
async function modulesLoadedBy(args: string[]): Promise<string[]> {
  const directory = await mkdtemp(join(tmpdir(), 'argo-cli-loading-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  const record = join(directory, 'modules');

  const result = await executeCli(bin, args, {
    cwd: tmpdir(),
    env: {
      ...process.env,
      NODE_OPTIONS: `--import=${recorder}`,
      ARGO_TEST_LOADED_MODULES: record,
    },
    timeout: processLimitMs,
  });

  expect(result.code).toBe(usageExitCode);

  return (await readFile(record, 'utf8')).split('\n');
}

const from =
  (path: string) =>
  (url: string): boolean =>
    url.includes(path);

// An Agent's MCP client waits only seconds for `argo mcp`, and the Plugin command brings the Engine with it.
it(
  'starts the MCP command without loading the Plugin command',
  async () => {
    const loaded = await modulesLoadedBy(['mcp', 'unexpected']);

    expect(loaded.filter(from('/apps/cli/src/mcp-command.ts'))).toHaveLength(1);
    expect(loaded.filter(from('/packages/plugin-kit/cli/'))).toEqual([]);
  },
  processLimitMs,
);
