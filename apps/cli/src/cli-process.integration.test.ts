import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { executeCli } from '../mocks/cli-process';

const deadlineMs = 2000;

const entry = fileURLToPath(
  new URL('../mocks/blocking-command.mjs', import.meta.url),
);

it('reports a process killed at its deadline as failure despite prior output', async () => {
  const result = await executeCli(entry, [], {
    cwd: tmpdir(),
    env: {},
    timeout: deadlineMs,
  });

  expect(result.stdout).toBe('fixture ready\n');
  expect(result.code).toBe(1);
});
